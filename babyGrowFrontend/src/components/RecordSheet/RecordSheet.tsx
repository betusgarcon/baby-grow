import { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import Icon from '@/components/Icon'
import { saveRecordToTimeline } from '@/store'
import RecordInputView from './RecordInputView'
import RecordResultView from './RecordResultView'
import {
  recordSheetCopy,
  resolveInputType,
  resolveRecognition,
  type RecordInputType,
} from './recordData'

type Stage = 'input' | 'analyzing' | 'result'

interface RecordSheetProps {
  visible: boolean
  onClose: () => void
  /** 保存成功后回调，页面可据此刷新时间线 */
  onSaved?: (type: RecordInputType) => void
}

/** 识别过程的演示时长。接入真实接口后由请求本身耗时决定 */
const ANALYZING_MS = 900

export default function RecordSheet({ visible, onClose, onSaved }: RecordSheetProps) {
  const [stage, setStage] = useState<Stage>('input')
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [inputType, setInputType] = useState<RecordInputType>('text')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 关闭后重置，下次打开是干净的录入态
  useEffect(() => {
    if (visible) return

    setStage('input')
    setText('')
    setPhoto(null)
  }, [visible])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  if (!visible) return null

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

  const analyze = () => {
    // 先定下形态再进入识别，结果页据此取对应的识别结果
    setInputType(resolveInputType(text, photo !== null))
    setStage('analyzing')

    timer.current = setTimeout(() => setStage('result'), ANALYZING_MS)
  }

  const save = () => {
    const recognition = resolveRecognition(inputType)

    // 真正写进时间线，而不是只弹一句「已保存」——保存完在旅程时间线上看得到
    saveRecordToTimeline({
      title: recognition.title,
      summary: recognition.summary,
      text,
      photo,
    })

    Taro.showToast({ title: '已保存到时间线', icon: 'none' })
    onSaved?.(inputType)
    onClose()
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
              onVoice={() => Taro.showToast({ title: '语音录入待开发', icon: 'none' })}
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
          ) : (
            <RecordResultView
              recognition={resolveRecognition(inputType)}
              inputText={text}
              photo={photo}
              onSave={save}
              onEdit={() => setStage('input')}
            />
          )}
        </ScrollView>
      </View>
    </View>
  )
}
