import React, { useState } from 'react';
import './Live.css';

const FB_PAGE_URL = 'https://www.facebook.com/p/Jesus-Winner-Ministry-Kajiado-Branch-100064616262795/';
const FB_PAGE_PLUGIN = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(FB_PAGE_URL)}&tabs=videos&width=734&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=false`;

function Live() {
  const [embedSrc, setEmbedSrc] = useState(FB_PAGE_PLUGIN);
  const [customUrl, setCustomUrl] = useState('');
  const [showInput, setShowInput] = useState(false);

  const loadCustom = () => {
    if (!customUrl.trim()) return;
    setEmbedSrc(`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(customUrl.trim())}&show_text=false&width=734`);
    setShowInput(false);
  };

  return (
    <div className="live-page">
      <div className="page-hero">
        <h1><i className="fas fa-circle live-dot"></i> Live Service</h1>
        <p>Join us live on Facebook for worship, prayer, and the Word of God</p>
      </div>
      <section className="section">
        <div className="live-container">
          <div className="live-notice">
            <i className="fas fa-info-circle"></i>
            <span>Live streams happen during our regular services. The player below shows our latest video automatically. If it does not load, click <strong>Watch on Facebook</strong> below.</span>
          </div>
          <div className="live-video-wrap">
            <iframe src={embedSrc} width="734" height="500"
              style={{ border:'none', overflow:'hidden', width:'100%', minHeight:'400px' }}
              scrolling="no" frameBorder="0" allowFullScreen={true}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              title="JWM Facebook Live"></iframe>
          </div>
          <div className="pastor-controls">
            <button className="btn-text-link" onClick={() => setShowInput(!showInput)}>
              <i className="fas fa-link"></i> {showInput ? 'Cancel' : 'Pastor: paste a specific live video link'}
            </button>
            {showInput && (
              <div className="url-input-wrap">
                <input type="url" placeholder="Paste Facebook video or live URL..."
                  value={customUrl} onChange={e => setCustomUrl(e.target.value)} />
                <button className="btn btn-primary btn-sm" onClick={loadCustom}>Load</button>
                <button className="btn btn-outline btn-sm" onClick={() => { setEmbedSrc(FB_PAGE_PLUGIN); setCustomUrl(''); setShowInput(false); }}>Reset</button>
              </div>
            )}
          </div>
          <div className="live-links">
            <h3>Watch on Other Platforms</h3>
            <div className="platform-buttons">
              <a href={FB_PAGE_URL} target="_blank" rel="noreferrer" className="platform-btn facebook"><i className="fab fa-facebook-f"></i><span>Facebook Page</span></a>
              <a href="https://www.youtube.com/@revtitusndiritu7527" target="_blank" rel="noreferrer" className="platform-btn youtube"><i className="fab fa-youtube"></i><span>YouTube</span></a>
              <a href="https://wa.me/254720178193" target="_blank" rel="noreferrer" className="platform-btn whatsapp"><i className="fab fa-whatsapp"></i><span>WhatsApp</span></a>
            </div>
          </div>
          <div className="live-schedule">
            <h3>Service Schedule (EAT — Nairobi Time)</h3>
            <div className="schedule-grid">
              {[
                { day:'Sunday', time:'6:00 AM & 1:00 PM', label:'Main Service' },
                { day:'Tuesday', time:'7:00 AM', label:'Huduma Service' },
                { day:'Wednesday', time:'5:00 AM', label:'Prayer & Faith' },
                { day:'Friday', time:'9:00 PM', label:'Vigil (Kesha)' },
              ].map((s,i) => (
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
