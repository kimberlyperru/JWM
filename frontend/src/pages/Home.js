import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const GALLERY_INITIAL = [
  { src: '/images/jwm-1.jpg', alt: 'Ministry gathering' },
  { src: '/images/jwm-2.jpg', alt: 'Prayer session' },
  { src: '/images/jwm-3.jpg', alt: 'Reverend Titus' },
  { src: '/images/jwm-4.jpg', alt: 'Child reading Bible' },
  { src: '/images/jwm-5.jpg', alt: 'Group prayer' },
  { src: '/images/jwm-6.jpg', alt: 'Anointing service' },
  { src: '/images/jwm-7.jpg', alt: 'Worship and dance' },
  { src: '/images/jwm-30.jpg', alt: 'Hands raised in worship' },
  { src: '/images/jwm-9.jpg', alt: 'Church choir' },
  { src: '/images/jwm-10.jpg', alt: 'Prayer for member' },
  { src: '/images/jwm-36.jpg', alt: 'Keyboard player' },
  { src: '/images/jwm-12.jpg', alt: 'Singer with mic' },
];

const GALLERY_MORE = [
  { src: '/images/jwm-13.jpg', alt: 'Ministry 13' },
  { src: '/images/jwm-14.jpg', alt: 'Ministry 14' },
  { src: '/images/jwm-15.jpg', alt: 'Ministry 15' },
  { src: '/images/jwm-16.jpg', alt: 'Ministry 16' },
  { src: '/images/jwm-17.jpg', alt: 'Ministry 17' },
  { src: '/images/jwm-18.jpg', alt: 'Ministry 18' },
  { src: '/images/jwm-19.jpg', alt: 'Ministry 19' },
  { src: '/images/jwm-20.jpg', alt: 'Ministry 20' },
  { src: '/images/jwm-21.jpg', alt: 'Ministry 21' },
  { src: '/images/jwm-48.jpg', alt: 'Ministry 47' },
  { src: '/images/jwm-33.jpg', alt: 'Ministry 33' },
  { src: '/images/jwm-38.jpg', alt: 'Ministry 38' },
];

function Home() {
  const [galleryImages, setGalleryImages] = useState(GALLERY_INITIAL);
  const [showMore, setShowMore] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [prayerForm, setPrayerForm] = useState({ fullName: '', phone: '', prayer: '' });
  const [prayerMsg, setPrayerMsg] = useState('');

  const handleLoadMore = () => {
    setGalleryImages([...galleryImages, ...GALLERY_MORE]);
    setShowMore(false);
  };

  const handlePrayerSubmit = (e) => {
    e.preventDefault();
    const { fullName, phone, prayer } = prayerForm;
    const msg = `🙏 *Prayer Request* 🙏\nName: ${fullName}\nPhone: ${phone}\n\nPrayer:\n${prayer}`;
    const url = `https://wa.me/254720178193?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setPrayerMsg('Your prayer request is being sent via WhatsApp. God bless you!');
    setPrayerForm({ fullName: '', phone: '', prayer: '' });
  };

  // Scroll to top button
  useEffect(() => {
    const btn = document.getElementById('scroll-top-btn');
    const onScroll = () => {
      if (btn) btn.classList.toggle('visible', window.scrollY > 200);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="home">
      {/* ---- HERO ---- */}
      <header className="hero" id="home">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>Jesus Winner Ministry</h1>
          <p className="hero-sub">A Ministry of All Nations</p>
          <p className="hero-desc">Kajiado Branch | Led by Reverend Titus Ndiritu</p>
          <div className="hero-buttons">
            <a href="#services" className="btn btn-accent">Join Us This Sunday</a>
            <a href="#prayer" className="btn btn-outline-white">Request Prayer</a>
          </div>
        </div>
      </header>

      {/* ---- ABOUT ---- */}
      <section className="section" id="about">
        <div className="section-title"><h2>About Us</h2></div>
        <div className="about-container">
          <p className="about-text">
            Jesus Winner Ministry (JWM) Kajiado Branch is a vibrant community dedicated to spreading
            the Gospel and transforming lives through faith, worship, and service. Led by Reverend
            Titus Ndiritu, we are committed to nurturing spiritual growth and fostering a supportive
            environment for all members.
          </p>
          <div className="about-highlight">
            <span>Healing</span><span>•</span><span>Restoration</span><span>•</span><span>Transformation</span>
          </div>
          <div className="about-cta">
            <Link to="/new-here" className="btn btn-primary">I'm New Here</Link>
            <Link to="/appointment" className="btn btn-outline">Book an Appointment</Link>
          </div>
        </div>
      </section>

      {/* ---- LEADERSHIP ---- */}
          <section className="section leadership-section" id="leadership">
        <div className="section-title"><h2>Meet Our Leadership</h2></div>
        <div className="leader-card">
          <img src="/images/jwm-37.jpg" alt="Kuria" />
          <div className="leader-info">
            <h3>Bishop Edward Mwai </h3>  
            <p>General Overseer</p>
            </div>
        </div>
        <div className="leader-card">
          <img src="/images/jwm-3.jpg" alt="Reverend Titus Ndiritu" />
          <div className="leader-info">
            <h3>Reverend Titus Ndiritu</h3>
            <p>Lead Pastor</p>
            <Link to="/appointment" className="btn btn-primary" style={{ marginTop: '14px', fontSize: '0.85rem' }}>
              Book an Appointment with Rev. Titus
            </Link>
          </div>
        </div>
        <div className="leader-card">
          <img src="/images/jwm-37.jpg" alt="Kuria" />
          <div className="leader-info">
            <h3>Pastor Antony Kuria </h3>  
            <p>Assistant Pastor</p>
            </div>
        </div>
        <div className="leader-card">
          <img src="/images/jwm-37.jpg" alt="Kuria" />
          <div className="leader-info">
            <h3>Pastor Karen Milanoi</h3>  
            {/* <p>Assistant Pastor</p> */}
            </div>
        </div>
      </section>

      {/* ---- SERVICES ---- */}
      <section className="section services-section" id="services">
        <div className="section-title">
          <h2>Weekly Church Program</h2>
          <p>Join us throughout the week for worship, prayer, and the Word</p>
        </div>
        <div className="card-grid">
          {[
            { img: '/images/jwm-35.jpg', title: 'Sunday Main Service', time: '06:00 AM – 1:00 PM', desc: 'Powerful Worship, Anointing, Healing, and Deliverance.' },
            { img: '/images/jwm-29.jpg', title: 'Sunday School (Ages 3–18)', time: '09:00 AM – 12:00 PM', desc: 'Young Kids: Bible stories & play. Teens: Mentorship & Gospel basics.' },
            { img: '/images/jwm-9.jpg', title: 'Tuesday Huduma', time: '07:00 AM – 1:00 PM', desc: 'Deep dive into the Word of God.' },
            { img: '/images/jwm-26.jpg', title: 'Wednesday Prayer & Faith', time: '5:00 AM – 9:00 AM', desc: 'Morning Glory: Spiritual Warfare and Prayer.' },
            { img: '/images/jwm-7.jpg', title: 'Wednesday Appointment', time: '9:00 AM – 3:00 PM', desc: 'One-on-One spiritual counseling with Rev. Titus Ndiritu.', link: '/appointment' },
            { img: '/images/jwm-20.jpg', title: 'Friday Vigil (Kesha)', time: '9:00 PM – Dawn', desc: 'Night of Worship, Prayer, and Prophecy.' },
          ].map((s, i) => (
            <div className="card" key={i}>
              <img src={s.img} alt={s.title} loading="lazy" />
              <div className="card-body">
                <h3>{s.title}</h3>
                <p className="card-time"><i className="fas fa-clock"></i> {s.time}</p>
                <p>{s.desc}</p>
                {s.link && <Link to={s.link} className="btn btn-primary" style={{ marginTop: '12px', fontSize: '0.85rem' }}>Book Now</Link>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- GALLERY ---- */}
      <section className="section gallery-section" id="gallery">
        <div className="section-title"><h2>Ministry Gallery</h2></div>
        <div className="gallery-grid">
          {galleryImages.map((img, i) => (
            <div className="gallery-item" key={i} onClick={() => setLightbox(img.src)}>
              <img src={img.src} alt={img.alt} loading="lazy" />
              <div className="gallery-overlay"><i className="fas fa-expand"></i></div>
            </div>
          ))}
        </div>
        {showMore && (
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button className="btn btn-outline" onClick={handleLoadMore}>View More Photos</button>
          </div>
        )}
      </section>

      {/* ---- EVENTS ---- */}
      <section className="section" id="events">
        <div className="section-title"><h2>Upcoming Events</h2></div>
        <div className="calendar-wrap">
          <iframe
            src="https://calendar.google.com/calendar/embed?src=info%40jwmkajiado.org&ctz=Africa%2FNairobi"
            style={{ border: 0 }}
            width="100%"
            height="500"
            frameBorder="0"
            scrolling="no"
            title="JWM Events Calendar"
          ></iframe>
        </div>
      </section>

      {/* ---- PRAYER ---- */}
      <section className="section prayer-section" id="prayer">
        <div className="section-title">
          <h2>Prayer Request</h2>
          <p>Submit your request and our prayer warriors will stand with you.</p>
        </div>
        <div className="form-card">
          {prayerMsg && <div className="alert alert-success">{prayerMsg}</div>}
          <form onSubmit={handlePrayerSubmit}>
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" placeholder="Your full name" required
                value={prayerForm.fullName}
                onChange={e => setPrayerForm({ ...prayerForm, fullName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Phone (WhatsApp) *</label>
              <input type="tel" placeholder="+254 7XX XXX XXX" required
                value={prayerForm.phone}
                onChange={e => setPrayerForm({ ...prayerForm, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Your Prayer Request *</label>
              <textarea rows="4" placeholder="Share your prayer request..." required
                value={prayerForm.prayer}
                onChange={e => setPrayerForm({ ...prayerForm, prayer: e.target.value })}></textarea>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <i className="fab fa-whatsapp"></i> Send via WhatsApp
            </button>
          </form>
        </div>
      </section>

      {/* ---- LOCATION ---- */}
      <section className="section" id="location">
        <div className="section-title">
          <h2>Find Us</h2>
          <p>Showground, Kajiado Town</p>
        </div>
        <div className="map-wrap">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3131.0166628854345!2d36.77488687369141!3d-1.8393764364780665!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182fc56542c53dcb%3A0xbe2abf9804a9cd9e!2sJESUS%20WINNER%20MINISTRY%20KAJIADO%20TOWN!5e1!3m2!1sen!2ske!4v1770145665919!5m2!1sen!2ske"
            width="100%" height="400" style={{ border: 0, borderRadius: '10px' }}
            allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            title="JWM Location"
          ></iframe>
        </div>
      </section>

      {/* ---- GIVING ---- */}
      <section className="section giving-section" id="giving">
        <div className="section-title">
          <h2>Support the Ministry</h2>
          <p>Your giving supports the Gospel and transforms lives</p>
        </div>
        <div className="giving-grid">
          <div className="giving-card">
            <i className="fas fa-mobile-alt giving-icon"></i>
            <h3>M-Pesa Paybill</h3>
            <div className="paybill-info">
              <p><strong>Paybill:</strong> 400200</p>
              <p><strong>Account:</strong> 32233</p>
            </div>
          </div>
          <div className="giving-card giving-card-cta">
            <i className="fas fa-hand-holding-heart giving-icon-white"></i>
            <h3>Give Online Now</h3>
            <p>Use our secure M-Pesa STK Push — your phone will be prompted directly.</p>
            <Link to="/give" className="btn btn-accent" style={{ marginTop: '16px' }}>Give Now</Link>
          </div>
          <div className="giving-card">
            <i className="fas fa-file-signature giving-icon"></i>
            <h3>Make a Pledge</h3>
            <p>Commit to a future gift and help us plan for the ministry's needs.</p>
            <Link to="/pledge" className="btn btn-outline" style={{ marginTop: '16px' }}>Pledge Now</Link>
          </div>
        </div>
      </section>

      {/* ---- LIGHTBOX ---- */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>
            <i className="fas fa-times"></i>
          </button>
          <img src={lightbox} alt="Gallery" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Scroll to top */}
      <button id="scroll-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <i className="fas fa-arrow-up"></i>
      </button>
    </div>
  );
}

export default Home;
