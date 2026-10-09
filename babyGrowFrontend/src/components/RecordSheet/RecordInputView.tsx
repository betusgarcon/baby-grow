import { View, Text, Textarea, Image } from '@tarojs/components'
import Icon from '@/components/Icon'
import { recordSheetCopy } from './recordData'

interface RecordInputViewProps {
  text: string
  photo: string | null
  onTextChange: (value: string) => void
  onPickPhoto: () => void
  onVoice: () => void
  onAnalyze: () => void
  onClose: () => void
}

export default function RecordInputView({
  text,
  photo,
  onTextChange,
  onPickPhoto,
  onVoice,
  onAnalyze,
  onClose,
}: RecordInputViewProps) {
  // 没有任何内容时不给提交，避免空记录走到识别结果
  const canAnalyze = text.trim().length > 0 || photo !== null

  return (
    <View className="flex flex-col gap-5">
      <View className="flex items-center justify-between">
        <Text className="text-2xl font-bold text-secondary">{recordSheetCopy.inputTitle}</Text>

        <View
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center"
          onClick={onClose}
        >
          <Icon name="close" className="w-4 h-4" />
        </View>
      </View>

      <View className="w-full box-border p-5 rounded-3xl bg-surface-container-low flex flex-col gap-3">
        <Textarea
          className="w-full h-32 text-base text-on-surface"
          value={text}
          placeholder={recordSheetCopy.placeholder}
          placeholderClass="text-on-surface-variant"
          maxlength={500}
          onInput={(event) => onTextChange(event.detail.value)}
        />

        {photo ? (
          <View className="w-24 h-24 rounded-2xl overflow-hidden bg-surface-container">
            <Image src={photo} className="w-full h-full" mode="aspectFill" />
          </View>
        ) : null}

        <View className="self-end flex items-center gap-3">
          <View
            className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center"
            onClick={onVoice}
          >
            <Icon name="mic" className="w-5 h-5" />
          </View>

          <View
            className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center"
            onClick={onPickPhoto}
          >
            <Icon name="photo-gallery" className="w-5 h-5" />
          </View>
        </View>
      </View>

      <View
        className={`w-full h-14 rounded-full flex items-center justify-center gap-2 ${
          canAnalyze ? 'bg-primary' : 'bg-surface-container'
        }`}
        onClick={canAnalyze ? onAnalyze : undefined}
      >
        <Text
          className={`text-lg font-semibold ${
            canAnalyze ? 'text-[#ffffff]' : 'text-on-surface-variant'
          }`}
        >
          {recordSheetCopy.analyzeCta}
        </Text>
        <Icon name="sparkle-light" className="w-5 h-5" />
      </View>
    </View>
  )
}
