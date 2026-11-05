// Encodes a still photo as a very short 4K HEVC clip. The TV draws web pages at 1920x1080 but video at
// full 4K, so this is how a wallpaper reaches every pixel of the panel.
// Build: xcrun swiftc -O still_to_hevc.swift -o still_to_hevc
// Usage: still_to_hevc <input.jpg> <output.mp4> hevc 30 30
import AVFoundation
import CoreGraphics
import Foundation
import ImageIO

let arguments = CommandLine.arguments
guard arguments.count == 6 else {
  print("usage: still_to_hevc <input> <output>")
  exit(2)
}
let inputURL = URL(fileURLWithPath: arguments[1])
let outputURL = URL(fileURLWithPath: arguments[2])
try? FileManager.default.removeItem(at: outputURL)

guard
  let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
  let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
else {
  print("could not read image")
  exit(1)
}
let width = Int(ProcessInfo.processInfo.environment["W"] ?? "3840")!
let height = Int(ProcessInfo.processInfo.environment["H"] ?? "2160")!
let codec: AVVideoCodecType = arguments[3] == "h264" ? .h264 : .hevc
let fps = Int(arguments[4])!
let frames = Int(arguments[5])!

let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let input = AVAssetWriterInput(
  mediaType: .video,
  outputSettings: [
    AVVideoCodecKey: codec,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
      AVVideoAverageBitRateKey: 30_000_000,
      AVVideoExpectedSourceFrameRateKey: fps,
      AVVideoMaxKeyFrameIntervalKey: fps,
    ],
    AVVideoColorPropertiesKey: [
      AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
      AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
      AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
    ],
  ])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
  assetWriterInput: input,
  sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
  ])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

var buffer: CVPixelBuffer?
CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32BGRA, nil, &buffer)
guard let pixels = buffer else {
  print("could not allocate frame")
  exit(1)
}
CVPixelBufferLockBaseAddress(pixels, [])
let context = CGContext(
  data: CVPixelBufferGetBaseAddress(pixels),
  width: width,
  height: height,
  bitsPerComponent: 8,
  bytesPerRow: CVPixelBufferGetBytesPerRow(pixels),
  space: CGColorSpace(name: CGColorSpace.sRGB)!,
  bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
CVPixelBufferUnlockBaseAddress(pixels, [])

// Identical frames: the encoder refines the picture with each one, and the launcher pauses on a late one.
for frame in 0..<frames {
  while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.01) }
  adaptor.append(pixels, withPresentationTime: CMTime(value: CMTimeValue(frame), timescale: CMTimeScale(fps)))
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status != .completed {
  print("failed: \(String(describing: writer.error))")
  exit(1)
}
print("wrote \(outputURL.path)")
