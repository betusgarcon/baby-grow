import { View, Text, Image } from '@tarojs/components'
import Icon from '@/components/Icon'
import { recordSheetCopy, type RecordRecognition, type RecordTag } from './recordData'

/** 金/银是「里程碑」档位本身的语义色，不是通用容器色，所以留作任意值 */
const TAG_CLASS: Record<RecordTag['variant'], string> = {
  outline: 'border border-outline-variant bg-transparent text-on-surface',
  gold: 'bg-[#f2d27a] text-[#6b5320]',
  silver: 'bg-[#dedcd7] text-[#4a4a4a]',
  hashtag: 'border border-outline-variant bg-transparent text-on-surface-variant',
}

interface RecordResultViewProps {
  recognition: RecordRecognition
  /** 用户原始输入，纯图片时为空 */
  inputText: string
  photo: string | null
  /** 落库进行中：禁用保存，避免重复提交 */
  saving?: boolean
  onSave: () => void
  onEdit: () => void
}

export default function RecordResultView({
  recognition,
  inputText,
  photo,
  saving = false,
  onSave,
  onEdit,
}: RecordResultViewProps) {
  const trimmedText = inputText.trim()

  return (
    <View className="flex flex-col gap-5">
      <View className="flex items-start gap-4">
        <View className="w-12 h-12 shrink-0 rounded-full bg-tertiary-container flex items-center justify-center">
          <Icon name="check-circle" className="w-6 h-6" />
        </View>

        <View className="flex-1 flex flex-col">
          <Text className="text-2xl font-bold text-secondary">{recognition.title}</Text>
          <Text className="text-base text-on-surface-variant">{recognition.subtitle}</Text>
        </View>
      </View>

      <View className="w-full h-px bg-outline-variant" />

      {/* 回显用户输入。有字就显示原文，纯图片则显示图片 */}
      {trimmedText ? (
        <View className="flex gap-2">
          <Text className="text-4xl leading-8 text-outline-variant">"</Text>
          <Text className="flex-1 text-lg italic text-on-surface">{trimmedText}</Text>
        </View>
      ) : null}

      {photo ? (
        <View className="w-full h-40 rounded-3xl overflow-hidden bg-surface-container">
          <Image src={photo} className="w-full h-full" mode="aspectFill" />
        </View>
      ) : null}

      <View className="w-full box-border p-4 rounded-3xl bg-surface-container-low flex flex-col gap-3">
        <View className="flex items-center gap-2">
          <Icon name="ai-conclude" className="w-4 h-4" />
          <Text className="text-caption font-semibold text-on-surface-variant">
            {recordSheetCopy.summaryLabel}
          </Text>
        </View>

        <Text className="text-base text-on-surface">{recognition.summary}</Text>

        <Text className="text-caption font-semibold text-on-surface-variant pt-1">
          {recordSheetCopy.tagsLabel}
        </Text>

        <View className="flex flex-wrap gap-2">
          {recognition.tags.map((tag) => (
            <View
              key={tag.label}
              className={`py-1 px-3 rounded-full flex items-center gap-1 ${TAG_CLASS[tag.variant]}`}
            >
              {tag.icon ? <Icon name={tag.icon} className="w-3 h-3" /> : null}
              <Text className="text-sm">{tag.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="flex flex-col gap-3">
        <View
          className={`w-full h-14 rounded-full flex items-center justify-center gap-2 ${
            saving ? 'bg-outline-variant' : 'bg-primary'
          }`}
          onClick={saving ? undefined : onSave}
        >
          <Icon name="save-timeline" className="w-5 h-5" />
          <Text className="text-lg font-semibold text-[#ffffff]">
            {saving ? 'Saving…' : recordSheetCopy.saveCta}
          </Text>
        </View>

        <View
          className="w-full h-14 rounded-full bg-surface-container flex items-center justify-center gap-2"
          onClick={saving ? undefined : onEdit}
        >
          <Icon name="pencil-teal" className="w-4 h-4" />
          <Text className="text-lg font-semibold text-secondary">{recordSheetCopy.editCta}</Text>
        </View>
      </View>
    </View>
  )
}
