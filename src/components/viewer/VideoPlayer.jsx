import React, { useRef } from 'react';

function getEmbedUrl(url) {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  // Direct video (mp4, webm, etc.)
  if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) return null; // use <video> tag

  return null;
}

export default function VideoPlayer({ url, caption }) {
  const embedUrl = getEmbedUrl(url);
  const isDirectVideo = url && url.match(/\.(mp4|webm|ogg)(\?|$)/i);

  const containerStyle = {
    position: 'relative',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  if (!url) return (
    <div className="rounded-xl bg-slate-100 h-48 flex items-center justify-center text-slate-400 text-sm">
      No video URL provided
    </div>
  );

  return (
    <figure className="my-6">
      {/* Overlay to block right-click/download on direct video */}
      <div style={containerStyle} className="rounded-xl overflow-hidden border border-slate-200 bg-black">
        {embedUrl ? (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src={embedUrl}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              title="Video"
            />
          </div>
        ) : isDirectVideo ? (
          <div style={{ position: 'relative' }}>
            {/* Transparent overlay blocks right-click download */}
            <div
              style={{ position: 'absolute', inset: 0, zIndex: 1 }}
              onContextMenu={(e) => e.preventDefault()}
            />
            <video
              controls
              controlsList="nodownload nofullscreen"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              className="w-full max-h-[500px]"
              style={{ display: 'block' }}
            >
              <source src={url} />
              Your browser does not support the video tag.
            </video>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            Unsupported video format
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="text-center text-sm text-slate-500 mt-2">{caption}</figcaption>
      )}
    </figure>
  );
}