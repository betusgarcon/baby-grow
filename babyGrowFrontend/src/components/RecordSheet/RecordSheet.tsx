import { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import Icon from '@/components/Icon'
import { loadTimeline, saveRecordToTimeline } from '@/store'
import { getConfig } from '@/api/config'
import {
  commitRecord,
  extractRecordText,
  pollAiTask,
  recognizeMedia,
  type ExtractResult,
} from '@/api/modules/ai'
import { uploadMedia } from '@/api/modules/media'
import RecordInputView from './RecordInputView'
import RecordResultView from './RecordResultView'
import {
  recognitionFromExtraction,
  recordSheetCopy,
  resolveInputType,
  resolveRecognition,
  type RecordInputType,
  type RecordRecognition,
} from './recordData'

type Stage = 'input' | 'analyzing' | 'result' | 'error'

interface RecordSheetProps {
  visible: boolean
  onClose: () => void
  /** 保存成功后回调，页面可据此刷新时间线 */
  onSaved?: (type: RecordInputType) => void
}

/** 未配置后端时的演示时长；接了后端则由请求耗时决定 */
const ANALYZING_MS = 900
/** 媒体识别的轮询间隔与上限。本地 VLM 单张图约 10s，60s 足够覆盖模型冷启动 */
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 60_000

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function RecordSheet({ visible, onClose, onSaved }: RecordSheetProps) {
  const [stage, setStage] = useState<Stage>('input')
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [inputType, setInputType] = useState<RecordInputType>('text')
  const [recognition, setRecognition] = useState<RecordRecognition | null>(null)
  const [extraction, setExtraction] = useState<ExtractResult | null>(null)
  const [mediaId, setMediaId] = useState<number | null>(null)
  const [taskId, setTaskId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [recording, setRecording] = useState(false)
  const recorder = useRef<ReturnType<typeof Taro.getRecorderManager> | null>(null)

  // 关闭后重置，下次打开是干净的录入态
  useEffect(() => {
    if (visible) return

    setStage('input')
    setText('')
    setPhoto(null)
    setRecognition(null)
    setExtraction(null)
    setMediaId(null)
    setTaskId(null)
    setError('')
  }, [visible])

  if (!visible) return null

  const hasBackend = () => Boolean(getConfig().baseUrl)

  const pickPhoto = () => {
    Taro.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: (result) => {
        const picked = result.tempFilePaths?.[0]

        if (picked) setPhoto(picked)
      },
      fail: () => undefined,
    })
  }

  /** 轮询到识别完成，或抛出可读的失败原因 */
  const waitForTask = async (id: number): Promise<ExtractResult | undefined> => {
    const deadline = Date.now() + POLL_TIMEOUT_MS

    while (Date.now() < deadline) {
      const { data } = await pollAiTask(id)

      if (data.status === 'succeeded') return data.result?.data ?? undefined
      if (data.status === 'failed') throw new Error(data.error || '识别失败')

      await delay(POLL_INTERVAL_MS)
    }

    throw new Error('识别超时，请稍后重试')
  }

  const analyze = async () => {
    const type = resolveInputType(text, photo !== null)

    setInputType(type)
    setError('')
    setStage('analyzing')

    // 未配置后端：退回本地演示数据，保证没有后端也能看页面
    if (!hasBackend()) {
      await delay(ANALYZING_MS)
      setRecognition(resolveRecognition(type))
      setStage('result')
      return
    }

    try {
      let uploadedId: number | null = null
      if (photo) {
        uploadedId = (await uploadMedia(photo)).mediaId
        setMediaId(uploadedId)
      }

      let result: ExtractResult | undefined
      if (uploadedId !== null) {
        const response = await recognizeMedia({ sourceType: 'IMAGE', mediaId: uploadedId, note: text })

        setTaskId(response.data.taskId)
        result = await waitForTask(response.data.taskId)
      } else {
        result = (await extractRecordText(text)).data.data
      }

      setExtraction(result ?? null)
      setRecognition(recognitionFromExtraction(result))
      setStage('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别失败，请稍后重试')
      setStage('error')
    }
  }

  /**
   * 语音录入用小程序原生录音。
   * 录音本身是真的；转文字要等后端，所以停下来先往正文里放一个占位标记，
   * 而不是假装已经识别出了内容。
   */
  const toggleVoice = () => {
    if (!recorder.current) {
      recorder.current = Taro.getRecorderManager()

      recorder.current.onStop(() => {
        setRecording(false)
        setText((previous) => (previous ? `${previous}\n[语音记录]` : '[语音记录]'))
        Taro.showToast({ title: '已录音，转文字待后端', icon: 'none' })
      })

      recorder.current.onError(() => {
        setRecording(false)
        Taro.showToast({ title: '录音失败，请检查麦克风权限', icon: 'none' })
      })
    }

    if (recording) {
      recorder.current.stop()
      return
    }

    recorder.current.start({ duration: 60000, format: 'mp3' })
    setRecording(true)
  }

  const save = async () => {
    const current = recognition ?? resolveRecognition(inputType)

    if (saving) return
    setSaving(true)

    try {
      if (!hasBackend()) {
        // 演示模式：只在本地时间线上追加一条
        saveRecordToTimeline({ title: current.title, summary: current.summary, text, photo })
      } else {
        await commitRecord({
          source: mediaId !== null ? 'IMAGE' : 'TEXT',
          mediaId: mediaId ?? undefined,
          taskId: taskId ?? undefined,
          text,
          title: current.title,
          description: extraction?.summary || current.summary,
          milestones: extraction?.milestones,
          food: extraction?.food,
          milk: extraction?.milk,
          sleep: extraction?.sleep,
          mood: extraction?.mood,
          // AI 返回 snake_case，落库接口用 camelCase，在这里转一次
          growth: extraction?.growth?.map((item) => ({
            heightCm: item.height_cm,
            weightKg: item.weight_kg,
            headCm: item.head_cm,
          })),
        })

        // 以服务端为准刷新，而不是本地拼一条——时间线上看到的必须是落库后的真数据
        await loadTimeline()
      }

      Taro.showToast({ title: '已保存到时间线', icon: 'none' })
      onSaved?.(inputType)
      onClose()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '保存失败',
        icon: 'none',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <View
      className="fixed inset-0 z-[100] flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(30, 27, 23, 0.35)' }}
      onClick={onClose}
    >
      <View
        className="w-full box-border bg-surface rounded-t-[2rem] px-5 pt-3 pb-8 flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <View className="w-10 h-1 rounded-full bg-outline-variant self-center mb-4" />

        <ScrollView scrollY className="w-full max-h-[70vh]" showScrollbar={false} enhanced>
          {stage === 'input' ? (
            <RecordInputView
              text={text}
              photo={photo}
              onTextChange={setText}
              onPickPhoto={pickPhoto}
              onVoice={toggleVoice}
              recording={recording}
              onAnalyze={analyze}
              onClose={onClose}
            />
          ) : stage === 'analyzing' ? (
            <View className="w-full py-16 flex flex-col items-center gap-4">
              <View className="w-14 h-14 rounded-full bg-primary flex items-center justify-center animate-pulse">
                <Icon name="sparkle-light" className="w-6 h-6" />
              </View>
              <Text className="text-base text-on-surface-variant">{recordSheetCopy.analyzingText}</Text>
            </View>
          ) : stage === 'error' ? (
            <View className="w-full py-12 flex flex-col items-center gap-4">
              <View className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center">
                <Icon name="event-medical" className="w-6 h-6" />
              </View>
              <Text className="text-base text-on-surface-variant text-center">{error}</Text>

              <View className="flex gap-3 pt-2">
                <View
                  className="px-6 h-12 rounded-full bg-surface-container flex items-center justify-center"
                  onClick={() => setStage('input')}
                >
                  <Text className="text-base font-semibold text-secondary">{recordSheetCopy.editCta}</Text>
                </View>

                <View
                  className="px-6 h-12 rounded-full bg-primary flex items-center justify-center"
                  onClick={analyze}
                >
                  <Text className="text-base font-semibold text-[#ffffff]">重试</Text>
                </View>
              </View>
            </View>
          ) : (
            <RecordResultView
              recognition={recognition ?? resolveRecognition(inputType)}
              inputText={text}
              photo={photo}
              saving={saving}
              onSave={save}
              onEdit={() => setStage('input')}
            />
          )}
        </ScrollView>
      </View>
    </View>
  )
}
