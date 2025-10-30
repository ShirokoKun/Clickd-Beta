export class VideoProcessor {
  async load(videoFile: File): Promise<HTMLVideoElement> {
    const url = URL.createObjectURL(videoFile);
    const video = document.createElement('video');
    video.src = url;
    video.crossOrigin = 'anonymous';
    await video.play().catch(() => {});
    video.pause();
    return new Promise((resolve) => {
      if (video.readyState >= 2) resolve(video);
      else video.onloadeddata = () => resolve(video);
    });
  }

  async extractFrame(video: HTMLVideoElement, timeSec: number): Promise<ImageBitmap> {
    return new Promise((resolve) => {
      const onSeeked = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(async (b) => {
          if (!b) return;
          const bmp = await createImageBitmap(b);
          resolve(bmp);
        });
        video.removeEventListener('seeked', onSeeked);
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = Math.min(timeSec, video.duration - 0.001);
    });
  }
}


