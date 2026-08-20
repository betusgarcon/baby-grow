import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import babyAvatar from '@/figma_demo/images/baby-avatar-5a3dae.png'
import iconCamera from '@/figma_demo/images/icon-camera.svg'
import iconGallery from '@/figma_demo/images/icon-gallery.svg'
import iconTrash from '@/figma_demo/images/icon-trash.svg'
import iconEditPhoto from '@/figma_demo/images/icon-edit-photo.svg'
import iconBack from '@/figma_demo/images/icon-back.svg'
import iconMore from '@/figma_demo/images/icon-more.svg'
import iconChevronRight from '@/figma_demo/images/icon-chevron-right.svg'

export default function ChangePhotoPage() {
  return (
    <View className="w-full min-h-screen bg-[#fff8f1] relative">
      {/* Decorative Background Blobs */}
      <View
        className="absolute w-64 h-64 rounded-full"
        style={{
          left: '-80px',
          top: '80px',
          backgroundColor: 'rgba(230, 191, 164, 0.2)',
          filter: 'blur(50px)',
        }}
      />
      <View
        className="absolute w-80 h-80 rounded-full"
        style={{
          left: '150px',
          top: '586px',
          backgroundColor: 'rgba(166, 208, 182, 0.2)',
          filter: 'blur(50px)',
        }}
      />

      {/* Header - TopAppBar */}
      <View
        className="fixed top-0 left-0 right-0 z-50 flex flex-row items-center justify-between px-5 py-3"
        style={{
          backgroundColor: 'rgba(255, 248, 241, 0.8)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 1px 2px rgba(30, 27, 23, 0.05)',
        }}
      >
        <View
          className="flex justify-center items-center p-1"
          onClick={() => Taro.navigateBack()}
        >
          <Image src={iconBack} className="w-5 h-5" mode="aspectFit" />
        </View>
        <Text className="text-xl font-semibold text-[#5f5f59] font-plus-jakarta leading-7">Change Photo</Text>
        <View
          className="flex justify-center items-center p-1"
          onClick={() => console.log('more clicked')}
        >
          <Image src={iconMore} className="h-5" mode="aspectFit" />
        </View>
      </View>

      {/* Main Content */}
      <View className="relative flex flex-col pt-20 px-5">
        {/* Preview Section */}
        <View className="flex flex-col items-center pb-8">
          {/* Dashed Border Circle */}
          <View className="relative w-72 h-72 flex items-center justify-center">
            {/* Dashed Border */}
            <View
              className="absolute w-72 h-72 rounded-full"
              style={{
                border: '2px dashed #E8E1D9',
              }}
            />
            {/* Avatar Circle */}
            <View
              className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-white"
              style={{ boxShadow: '0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
            >
              <Image src={babyAvatar} className="w-full h-full" mode="aspectFill" />
            </View>
            {/* Decorative Edit Button */}
            <View
              className="absolute w-12 h-12 rounded-full flex items-center justify-center border-4 border-white"
              style={{
                right: '8px',
                bottom: '8px',
                backgroundColor: '#FED5B9',
                boxShadow: '0 4px 6px -4px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              }}
              onClick={() => console.log('edit photo')}
            >
              <Image src={iconEditPhoto} className="w-5 h-5" mode="aspectFit" />
            </View>
          </View>
        </View>

        {/* Action Section */}
        <View className="flex flex-col gap-4">
          {/* Title and Description */}
          <View className="flex flex-col gap-2 items-center">
            <Text className="text-base font-normal text-[#1e1b17] font-plus-jakarta leading-6 text-center">
              Capture a new memory
            </Text>
            <Text className="text-base font-normal text-[#474741] font-nunito-sans leading-6 text-center">
              Update the profile picture for your little one's{'\n'}timeline.
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex flex-col gap-4 pt-2">
            {/* Take Photo Button */}
            <View
              className="flex flex-row items-center justify-between p-6 rounded-[32px] bg-[#fffdf5]"
              style={{ border: '1px solid #C8C7BE' }}
              onClick={() => console.log('take photo')}
            >
              <View className="flex flex-row items-center gap-4">
                {/* Icon Background */}
                <View className="w-12 h-12 rounded-full flex items-center justify-center bg-[#ffdcc4]">
                  <Image src={iconCamera} className="w-5 h-5" mode="aspectFit" />
                </View>
                {/* Text Content */}
                <View className="flex flex-col">
                  <Text className="text-base font-normal text-[#1e1b17] font-plus-jakarta leading-6">Take Photo</Text>
                  <Text className="text-base font-normal text-[#474741] font-nunito-sans leading-6">Use your camera now</Text>
                </View>
              </View>
              <Image src={iconChevronRight} className="w-2 h-3" mode="aspectFit" />
            </View>

            {/* Choose from Gallery Button */}
            <View
              className="flex flex-row items-center justify-between p-6 rounded-[32px] bg-[#fffdf5]"
              style={{ border: '1px solid #C8C7BE' }}
              onClick={() => console.log('choose from gallery')}
            >
              <View className="flex flex-row items-center gap-4">
                {/* Icon Background */}
                <View className="w-12 h-12 rounded-full flex items-center justify-center bg-[#c1edd1]">
                  <Image src={iconGallery} className="w-5 h-5" mode="aspectFit" />
                </View>
                {/* Text Content */}
                <View className="flex flex-col">
                  <Text className="text-base font-normal text-[#1e1b17] font-plus-jakarta leading-6">Choose from Gallery</Text>
                  <Text className="text-base font-normal text-[#474741] font-nunito-sans leading-6">Select from your library</Text>
                </View>
              </View>
              <Image src={iconChevronRight} className="w-2 h-3" mode="aspectFit" />
            </View>
          </View>

          {/* Remove Photo Button */}
          <View className="flex flex-row justify-center pt-6">
            <View
              className="flex flex-row items-center gap-2 px-6 py-3"
              onClick={() => console.log('remove photo')}
            >
              <Image src={iconTrash} className="w-4 h-5" mode="aspectFit" />
              <Text className="text-base font-normal text-[#ba1a1a] font-nunito-sans leading-6">
                Remove current photo
              </Text>
            </View>
          </View>
        </View>

        {/* Cancel Footer */}
        <View className="pt-8">
          <View
            className="flex flex-row justify-center items-center py-4 rounded-full bg-[#faf2ea]"
            style={{ border: '1px solid rgba(200, 199, 190, 0.3)' }}
            onClick={() => Taro.navigateBack()}
          >
            <Text className="text-xl font-semibold text-[#5f5f59] font-plus-jakarta leading-7">Cancel</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
