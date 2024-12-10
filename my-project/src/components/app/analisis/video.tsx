export default function VideoFeed() {
  return (
    <div className="bg-gray-200 aspect-video rounded-lg flex items-center justify-center">
      <video className="w-full h-full" autoPlay>
        <source src="/images/video.mp4" type="video/mp4" />
        Tu navegador no soporta la etiqueta de video.
      </video>
    </div>
  );
}
