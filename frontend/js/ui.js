// UI utilities, syntax highlighting, theme toggle, toasts, and dashboard renderers

const UI = {
  // Python syntax highlighter
  highlightPython(code) {
    if (!code) return "";
    
    // Escape HTML first
    let escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const lines = escaped.split('\n');
    const highlightedLines = lines.map(line => {
      // Check for comments
      const commentIndex = line.indexOf('#');
      let commentPart = '';
      let codePart = line;
      if (commentIndex !== -1) {
        commentPart = `<span class="syn-comment">${line.substring(commentIndex)}</span>`;
        codePart = line.substring(0, commentIndex);
      }

      // Strings (single and double quotes)
      codePart = codePart.replace(/(['"])(.*?)\1/g, '<span class="syn-string">$1$2$1</span>');

      // Keywords
      const keywords = ['import', 'from', 'as', 'def', 'return', 'class', 'if', 'else', 'elif', 'for', 'in', 'while', 'True', 'False', 'None', 'try', 'except', 'with'];
      keywords.forEach(kw => {
        const regex = new RegExp(`\\b(${kw})\\b`, 'g');
        codePart = codePart.replace(regex, '<span class="syn-keyword">$1</span>');
      });

      // Built-in / prominent functions
      const functions = ['print', 'len', 'range', 'list', 'dict', 'set', 'round', 'head', 'fit_transform', 'transform', 'read_csv', 'drop', 'fillna', 'clip', 'quantile', 'get_dummies', 'duplicated'];
      functions.forEach(fn => {
        const regex = new RegExp(`\\b(${fn})\\b(?=\\()`, 'g');
        codePart = codePart.replace(regex, '<span class="syn-function">$1</span>');
      });

      // Numbers
      codePart = codePart.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="syn-number">$1</span>');

      return codePart + commentPart;
    });

    return highlightedLines.join('\n');
  },

  // Render Dataframe table matching Screenshot 1 Out [1]
  renderDataFrameTable(previewData) {
    if (!previewData || !previewData.columns) {
      return '<div class="empty-output">No output data generated.</div>';
    }

    const cols = previewData.columns;
    const rows = previewData.rows || [];
    const index = previewData.index || [];

    let html = `<div class="dataframe-table-container">
      <table class="dataframe-table">
        <thead>
          <tr>
            <th></th>
            ${cols.map(c => `<th>${c}</th>`).join('')}
          </tr>
        </thead>
        <tbody>`;

    rows.forEach((row, rIdx) => {
      const idxVal = index[rIdx] !== undefined ? index[rIdx] : rIdx;
      html += `<tr>
        <td><strong>${idxVal}</strong></td>
        ${row.map(val => `<td>${val === null || val === undefined ? '<span style="color:var(--text-subtle);">NaN</span>' : val}</td>`).join('')}
      </tr>`;
    });

    html += `</tbody></table></div>`;
    return html;
  },

  // Toast Notification
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = `ℹ️`;
    if (type === 'success') icon = `✅`;
    if (type === 'error') icon = `⚠️`;

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  },

  // Theme Toggler
  initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateThemeIcon(saved);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    this.updateThemeIcon(next);
  },

  updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    if (theme === 'dark') {
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
    } else {
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
  }
};

window.UI = UI;
