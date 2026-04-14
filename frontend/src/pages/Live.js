import React, { useState, useEffect } from 'react';
import './Live.css';

// ✅ FIXED: Facebook page video embeds via the standard plugin URL
// The old URL (plugins/video.php?href=PAGE_URL) only works for specific videos,
// not for live streams from a Page. Facebook now requires either:
// a) A specific live video URL (changes every stream)
// b) The Facebook Page Plugin (shows latest video / live)
// We use option (b) as a fallback + direct links as the primary option.

const FB_PAGE_URL = 'https://www.facebook.com/p/Jesus-Winner-Ministry-Kajiado-Branch-100064616262795/';
const FB_PAGE_ID  = '100064616262795';

// This embed URL uses the Facebook Page Plugin (videos tab)
// It shows the latest video or live stream automatically
const FB_PAGE_PLUGIN_URL =
  `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(FB_PAGE_URL)}&tabs=videos&width=734&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=false&appId`;

function Live() {
  const [embedMode, setEmbedMode] = useState('page-plugin'); // 'page-plugin' | 'video-url' | 'failed'
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [embedSrc, setEmbedSrc] = useState(FB_PAGE_PLUGIN_URL);

  // If pastor pastes a specific live video URL, build its embed
  const handleCustomUrl = () => {
    if (!customVideoUrl.trim()) return;
    const encoded = encodeURIComponent(customVideoUrl.trim());
    const src = `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&width=734&mute=0`;
    setEmbedSrc(src);
    setEmbedMode('video-url');
    setShowUrlInput(false);
  };

  return (
    <div className="live-page">
      <div className="page-hero">
        <h1><i className="fas fa-circle live-dot"></i> Live Service</h1>
        <p>Join us live on Facebook for worship, prayer, and the Word of God</p>
      </div>

      <section className="section">
        <div className="live-container">

          {/* Info notice */}
          <div className="live-notice">
            <i className="fas fa-info-circle"></i>
            <span>
              Live streams broadcast during our regular services. The video player below shows our
              most recent stream. During a live service, it will show the live feed automatically.
              If the video does not load, click <strong>"Watch on Facebook"</strong> below.
            </span>
          </div>

          {/* ✅ FIXED: Facebook Page Plugin (shows latest video or live) */}
          {embedMode !== 'failed' ? (
            <div className="live-video-wrap">
              <iframe
                src={embedSrc}
                width="734"
                height="500"
                style={{
                  border: 'none',
                  overflow: 'hidden',
                  width: '100%',
                  minHeight: '400px'
                }}
                scrolling="no"
                frameBorder="0"
                allowFullScreen={true}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                title="JWM Facebook Live"
              ></iframe>
            </div>
          ) : (
            <div className="live-fallback-box">
              <i className="fab fa-facebook" style={{ fontSize: '3.5rem', color: '#1877f2', marginBottom: 16 }}></i>
              <h3>Watch on Facebook</h3>
              <p>Tap the button below to watch the live service on Facebook directly.</p>
              <a href={FB_PAGE_URL} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ marginTop: 16 }}>
                <i className="fab fa-facebook-f"></i> Open Facebook Page
              </a>
            </div>
          )}

          {/* Pastor controls — paste a specific video link */}
          <div className="pastor-controls">
            <button
              className="btn-text-link"
              onClick={() => setShowUrlInput(!showUrlInput)}
            >
              <i className="fas fa-link"></i>
              {showUrlInput ? 'Cancel' : 'Pastor: Paste a specific video/live link'}
            </button>
            {showUrlInput && (
              <div className="url-input-wrap">
                <input
                  type="url"
                  placeholder="Paste Facebook video or live URL here..."
                  value={customVideoUrl}
                  onChange={e => setCustomVideoUrl(e.target.value)}
                />
                <button className="btn btn-primary btn-sm" onClick={handleCustomUrl}>
                  Load Video
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => { setEmbedSrc(FB_PAGE_PLUGIN_URL); setEmbedMode('page-plugin'); setCustomVideoUrl(''); setShowUrlInput(false); }}>
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Watch on other platforms */}
          <div className="live-links">
            <h3>Watch on Other Platforms</h3>
            <div className="platform-buttons">
              <a href={FB_PAGE_URL} target="_blank" rel="noreferrer" className="platform-btn facebook">
                <i className="fab fa-facebook-f"></i>
                <span>Facebook Page</span>
              </a>
              <a href="https://www.youtube.com/@revtitusndiritu7527" target="_blank" rel="noreferrer" className="platform-btn youtube">
                <i className="fab fa-youtube"></i>
                <span>YouTube Channel</span>
              </a>
              <a href="https://wa.me/254720178193" target="_blank" rel="noreferrer" className="platform-btn whatsapp">
                <i className="fab fa-whatsapp"></i>
                <span>WhatsApp Updates</span>
              </a>
            </div>
          </div>

          {/* Service Schedule */}
          <div className="live-schedule">
            <h3>Service Schedule (EAT — Nairobi Time)</h3>
            <div className="schedule-grid">
              {[
                { day: 'Sunday',    time: '6:00 AM & 1:00 PM', label: 'Main Service' },
                { day: 'Tuesday',   time: '7:00 AM',            label: 'Huduma Service' },
                { day: 'Wednesday', time: '5:00 AM',            label: 'Prayer & Faith' },
                { day: 'Friday',    time: '9:00 PM',            label: 'Vigil (Kesha)' },
              ].map((s, i) => (
                <div className="schedule-card" key={i}>
                  <div className="schedule-day">{s.day}</div>
                  <div className="schedule-time">{s.time}</div>
                  <div className="schedule-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

export default Live;
