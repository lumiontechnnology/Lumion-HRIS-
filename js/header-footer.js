// Inject shared header and footer across pages
import { Store } from './store.js';

function createHeader(){
  const user = Store.currentUser();
  const wrap = document.createElement('div'); wrap.id = 'site-header';
  wrap.innerHTML = `
    <header class="site-header minimal">
      <div class="site-brand">
        <img src="/Logo__mark.png" alt="Lumion" />
        <span style="color:#4f46e5">Lumion</span>
      </div>
      <nav class="site-nav">
        <div class="nav-item has-dropdown">
          <a href="/index.html" id="productLink">Product</a>
          <div class="dropdown" id="productDropdown">
            <a href="/hris-dashboard-admin.html">Overview</a>
            <a href="/employees.html">Employees</a>
            <a href="/payroll-dashboard.html">Payroll</a>
            <a href="/Jobs.html">Jobs</a>
            <a href="/Onboarding.html">Onboarding</a>
            <a href="/leave-attendance.html">Leave & Attendance</a>
            <a href="/hr-performance.html">HR Performance</a>
            <a href="/analytics.html">Analytics</a>
            <a href="/Jobs.html#inviteBtn">Invite Team</a>
          </div>
        </div>
        <div class="nav-item has-dropdown">
          <a href="/analytics.html" id="resourcesLink">Resources</a>
          <div class="dropdown" id="resourcesDropdown">
            <a href="/resources/market-research.html">Market Research</a>
            <a href="/resources/competitor-analysis.html">Competitor Analysis</a>
            <a href="/pulse/index.html">People Analytics</a>
          </div>
        </div>
        <a href="https://github.com/lumiontechnnology/Lumion-HRIS-" target="_blank" rel="noopener">Developers</a>
        <a href="/team.html">Team</a>
      </nav>
      <div class="site-actions">
        ${user ? `
          <a class="btn" href="${user.role==='admin' ? '/hris-dashboard-admin.html' : '/user-dashboard.html'}">Dashboard</a>
          <button class="btn danger" id="site-logout">Logout</button>
        ` : `
          <a class="btn" href="/login.html">Login</a>
          <a class="btn primary" href="#">Sign Up</a>
        `}
        <div class="hamburger" id="hamburger"><span></span></div>
        <div class="mobile-menu" id="mobileMenu">
          <a href="/index.html">Product</a>
          <div class="mobile-sub">
            <a href="/hris-dashboard-admin.html">Overview</a>
            <a href="/employees.html">Employees</a>
            <a href="/payroll-dashboard.html">Payroll</a>
            <a href="/Jobs.html">Jobs</a>
            <a href="/Onboarding.html">Onboarding</a>
            <a href="/leave-attendance.html">Leave & Attendance</a>
            <a href="/hr-performance.html">HR Performance</a>
            <a href="/analytics.html">Analytics</a>
            <a href="/Jobs.html#inviteBtn">Invite Team</a>
          </div>
          <a href="/analytics.html">Resources</a>
          <div class="mobile-sub">
            <a href="/resources/market-research.html">Market Research</a>
            <a href="/resources/competitor-analysis.html">Competitor Analysis</a>
            <a href="/pulse/index.html">People Analytics</a>
          </div>
          <a href="https://github.com/lumiontechnnology/Lumion-HRIS-" target="_blank" rel="noopener">Developers</a>
          <a href="/team.html">Team</a>
          ${user ? `
            <a href="${user.role==='admin' ? '/hris-dashboard-admin.html' : '/user-dashboard.html'}">Dashboard</a>
            <button id="site-logout-mobile" class="btn danger" style="margin-top:8px">Logout</button>
          ` : `
            <a href="/login.html">Login</a>
            <a href="#">Sign Up</a>
          `}
        </div>
      </div>
    </header>`;
  return wrap;
}

function createFooter(){
  const wrap = document.createElement('div'); wrap.id = 'site-footer';
  wrap.innerHTML = `
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand">
            <div style="display:flex; align-items:center; gap:8px;">
              <img src="/Logo__mark.png" alt="Lumion" style="height:32px; width:32px;" />
              <strong>Lumion</strong>
            </div>
            <div class="tagline">Automating job search with AI-powered applications and HR workflows.</div>
          </div>
          <div class="footer-col"><h4>Product</h4><ul>
            <li><a href="/user-dashboard.html">User Dashboard</a></li>
            <li><a href="/hris-dashboard-admin.html">Admin Dashboard</a></li>
            <li><a href="/leave-attendance.html">Leave & Attendance</a></li>
            <li><a href="/payroll-dashboard.html">Payroll</a></li>
            <li><a href="/analytics.html">Analytics</a></li>
            <li><a href="/performance-dashboard.html">Performance</a></li>
            <li><a href="/performance-dashboard.html">HR Performance</a></li>
          </ul></div>
          <div class="footer-col"><h4>Resources</h4><ul>
            <li><a href="/pulse/index.html">People Analytics</a></li>
            <li><a href="/resources/competitor-analysis.html">Competitor Analysis</a></li>
            <li><a href="/resources/market-research.html">Market Research</a></li>
            <li><a href="#">Legal Guidelines</a></li>
          </ul></div>
          <div class="footer-col"><h4>Developers</h4><ul>
            <li><a href="https://github.com" target="_blank" rel="noopener">API Documentation</a></li>
            <li><a href="https://github.com" target="_blank" rel="noopener">GitHub Repository</a></li>
            <li><a href="#">Technical Specs</a></li>
            <li><a href="#">Dev Environment</a></li>
            <li><a href="#">Support</a></li>
          </ul></div>
          <div class="footer-col"><h4>Team</h4><ul>
            <li><a href="/team.html">Founder & Team</a></li>
            <li><a href="#">Project Management</a></li>
            <li><a href="#">Development Team</a></li>
            <li><a href="#">Design Team</a></li>
          </ul></div>
        </div>
        <div class="footer-divider"></div>
        <div class="footer-bottom">
          <div class="social">
            <a href="https://github.com" target="_blank" aria-label="GitHub">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58l-.02-2.27c-3.34.73-4.04-1.6-4.04-1.6-.55-1.38-1.35-1.75-1.35-1.75-1.1-.75.08-.74.08-.74 1.22.09 1.86 1.25 1.86 1.25 1.08 1.85 2.83 1.32 3.52 1.01.11-.8.42-1.32.76-1.63-2.67-.3-5.47-1.34-5.47-5.98 0-1.32.47-2.4 1.24-3.24-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.92 1.24 3.24 0 4.65-2.8 5.68-5.48 5.98.43.37.81 1.1.81 2.22l-.01 3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z"/></svg>
            </a>
            <a href="https://www.linkedin.com" target="_blank" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zm7 0h3.8v2h.05c.53-1 1.82-2 3.75-2 4 0 4.7 2.6 4.7 6V23h-4v-5.3c0-1.27-.02-2.9-1.77-2.9-1.77 0-2.04 1.38-2.04 2.8V23h-4V8.5z"/></svg>
            </a>
            <a href="https://twitter.com" target="_blank" aria-label="Twitter">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.27 4.27 0 0 0 1.87-2.36 8.49 8.49 0 0 1-2.71 1.04 4.24 4.24 0 0 0-7.22 3.86A12.04 12.04 0 0 1 3.1 4.86a4.23 4.23 0 0 0 1.31 5.65 4.21 4.21 0 0 1-1.92-.53v.05a4.24 4.24 0 0 0 3.4 4.16c-.47.13-.97.2-1.48.2-.36 0-.72-.03-1.06-.1a4.25 4.25 0 0 0 3.96 2.94A8.51 8.51 0 0 1 2 20.5c-.33 0-.66-.02-.98-.06a12.02 12.02 0 0 0 6.5 1.9c7.82 0 12.1-6.48 12.1-12.1 0-.18-.01-.36-.02-.54A8.63 8.63 0 0 0 24 6.5a8.5 8.5 0 0 1-2.54.7z"/></svg>
            </a>
            <a href="mailto:Lumiontechnnology@gmail.com" aria-label="Email">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M2 4h20v16H2V4zm2 2v12h16V6H4zm8 6 8-6H4l8 6zm0 2-8-6v10h16V8l-8 6z"/></svg>
            </a>
          </div>
          <div class="copyright">© ${new Date().getFullYear()} Lumion. All rights reserved.</div>
        </div>
      </div>
    </footer>`;
  return wrap;
}

function injectHeaderFooter(){
  // Header
  const headerRoot = createHeader();
  document.body.prepend(headerRoot);
  const ham = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  if (ham && menu){ ham.addEventListener('click', ()=> { const show = menu.style.display==='block'; menu.style.display = show ? 'none' : 'block'; }); }
  // Dropdown toggle for Product
  const prodLink = document.getElementById('productLink');
  const prodDrop = document.getElementById('productDropdown');
  if (prodLink && prodDrop){
    prodLink.addEventListener('click', (e)=>{ e.preventDefault(); const s = getComputedStyle(prodDrop).display; prodDrop.style.display = s==='none' ? 'block' : 'none'; });
    document.addEventListener('click', (e)=>{
      if (!prodDrop.contains(e.target) && e.target !== prodLink){ prodDrop.style.display = 'none'; }
    });
  }
  // Dropdown toggle for Resources
  const resLink = document.getElementById('resourcesLink');
  const resDrop = document.getElementById('resourcesDropdown');
  if (resLink && resDrop){
    resLink.addEventListener('click', (e)=>{ e.preventDefault(); const s = getComputedStyle(resDrop).display; resDrop.style.display = s==='none' ? 'block' : 'none'; });
    document.addEventListener('click', (e)=>{
      if (!resDrop.contains(e.target) && e.target !== resLink){ resDrop.style.display = 'none'; }
    });
  }
  // Logout buttons
  const logoutBtn = document.getElementById('site-logout');
  const logoutBtnMobile = document.getElementById('site-logout-mobile');
  const bindLogout = (btn)=> btn && (btn.onclick = ()=>{ Store.logout(); localStorage.removeItem('isLoggedIn'); window.location.href = '/login.html'; });
  bindLogout(logoutBtn); bindLogout(logoutBtnMobile);
  // Footer
  const footerRoot = createFooter();
  document.body.appendChild(footerRoot);
}

// Load CSS if not present
function ensureCss(){
  const href = '/assets/site-ui.css';
  if (!document.querySelector('link[href*="site-ui.css"]')){
    const link = document.createElement('link'); link.rel='stylesheet'; link.href=href; document.head.appendChild(link);
  }
}

document.addEventListener('DOMContentLoaded', ()=> { ensureCss(); injectHeaderFooter(); });