import React, { useState } from 'react';
import './Live.css';

const FB_PAGE_URL = 'https://www.facebook.com/p/Jesus-Winner-Ministry-Kajiado-Branch-100064616262795/';
const FB_EMBED_URL = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(FB_PAGE_URL)}&show_text=false&width=734`;

function Live() {
  const [embedError, setEmbedError] = useState(false);

  return (
    <div className="live-page">
      <div className="page-hero">
        <h1><i className="fas fa-circle live-dot"></i> Live Service</h1>
        <p>Join us live on Facebook for worship, prayer, and the Word of God</p>
      </div>

      <section className="section">
        <div className="live-container">

          {/* Live notice */}
          <div className="live-notice">
            <i className="fas fa-info-circle"></i>
            <span>
              Live streams happen during our regular services. If there is no live stream currently,
              you can watch our most recent videos on Facebook and YouTube below.
            </span>
          </div>

          {/* Facebook Live Embed */}
          <div className="live-video-wrap">
            {!embedError ? (
              <iframe
                src={FB_EMBED_URL}
                width="100%"
                height="100%"
                style={{ border: 'none', overflow: 'hidden', minHeight: '450px' }}
                scrolling="no"
                frameBorder="0"
                allowFullScreen={true}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                title="JWM Facebook Live"
                onError={() => setEmbedError(true)}
              ></iframe>
            ) : (
              <div className="live-fallback">
                <i className="fab fa-facebook" style={{ fontSize: '3rem', color: '#1877f2' }}></i>
                <p>Could not load the live stream embed.</p>
                <a
                  href={FB_PAGE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                >
                  Watch on Facebook
                </a>
              </div>
            )}
          </div>

          {/* Watch on other platforms */}
          <div className="live-links">
            <h3>Watch on Other Platforms</h3>
            <div className="platform-buttons">
              <a
                href={FB_PAGE_URL}
                target="_blank"
                rel="noreferrer"
                className="platform-btn facebook"
              >
                <i className="fab fa-facebook-f"></i>
                <span>Facebook Live</span>
              </a>
              <a
                href="https://www.youtube.com/@revtitusndiritu7527"
                target="_blank"
                rel="noreferrer"
                className="platform-btn youtube"
              >
                <i className="fab fa-youtube"></i>
                <span>YouTube Channel</span>
              </a>
              <a
                href="https://wa.me/254720178193"
                target="_blank"
                rel="noreferrer"
                className="platform-btn whatsapp"
              >
                <i className="fab fa-whatsapp"></i>
                <span>WhatsApp Updates</span>
              </a>
            </div>
          </div>

          {/* Service Schedule */}
          <div className="live-schedule">
            <h3>Service Schedule (EAT - Nairobi Time)</h3>
            <div className="schedule-grid">
              {[
                { day: 'Sunday', time: '6:00 AM & 1:00 PM', label: 'Main Service' },
                { day: 'Tuesday', time: '7:00 AM', label: 'Huduma Service' },
                { day: 'Wednesday', time: '5:00 AM', label: 'Prayer & Faith' },
                { day: 'Friday', time: '9:00 PM', label: 'Vigil (Kesha)' },
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
