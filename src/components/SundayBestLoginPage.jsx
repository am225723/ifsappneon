import { useEffect } from 'react';
import FinalIFSLoginPage from './FinalIFSLoginPage.jsx';
import './SundayBestLoginTitle.css';

export default function SundayBestLoginPage() {
  useEffect(() => {
    const title = document.querySelector('#gravity-center + h1');
    if (!title) return undefined;

    const previousHtml = title.innerHTML;
    const previousLabel = title.getAttribute('aria-label');

    title.classList.add('ifs-title-sunday');
    title.setAttribute('aria-label', 'IFS Healing');
    title.innerHTML = `
      <span class="ifs-title-word" aria-hidden="true">
        <span class="ifs-title-initial">I</span><span class="ifs-title-rest">FS</span>
      </span>
      <span class="ifs-title-word" aria-hidden="true">
        <span class="ifs-title-initial">H</span><span class="ifs-title-rest">EALING</span>
      </span>
    `;

    return () => {
      title.classList.remove('ifs-title-sunday');
      if (previousLabel) {
        title.setAttribute('aria-label', previousLabel);
      } else {
        title.removeAttribute('aria-label');
      }
      title.innerHTML = previousHtml;
    };
  }, []);

  return <FinalIFSLoginPage />;
}
