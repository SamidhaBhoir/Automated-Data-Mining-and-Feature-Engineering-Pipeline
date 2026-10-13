// Pipeline Stepper and Execution Engine Handler

const Pipeline = {
  activeStepIdx: 5, // Default to step 6 (index 5) matching Screenshot 1
  blueprint: [],
  steps: [],
  sessionData: null,
  isRunningAll: false,

  init(sessionData) {
    this.sessionData = sessionData;
    this.blueprint = sessionData.blueprint || [];
    this.steps = sessionData.steps || [];
    this.activeStepIdx = sessionData.active_step_index !== undefined ? sessionData.active_step_index : 0;
    this.render();
  },

  updateSession(sessionData) {
    this.sessionData = sessionData;
    this.blueprint = sessionData.blueprint || [];
    this.steps = sessionData.steps || [];
    if (sessionData.active_step_index !== undefined) {
      this.activeStepIdx = sessionData.active_step_index;
    }
    this.render();
  },

  render() {
    this.renderStage();
    this.renderInspector();
    this.renderSidebarProgress();
  },

  // Get current active step data
  getCurrentStep() {
    if (this.steps && this.steps[this.activeStepIdx]) {
      return this.steps[this.activeStepIdx];
    }
    if (this.blueprint && this.blueprint[this.activeStepIdx]) {
      const bp = this.blueprint[this.activeStepIdx];
      return {
        id: bp.id,
        name: bp.name,
        title: bp.title,
        description: bp.description,
        code: `# ${bp.id}. ${bp.name}\n# Click 'Run Step' or 'Accept & Continue' to execute`,
        recommendation: "Recommended transformation based on dataset profiling.",
        recommendation_tag: "AI Suggested",
        selected_method: bp.default_params?.method || bp.name,
        columns_affected: [],
        preview_data: null,
        status: "pending"
      };
    }
    return null;
  },

  // Render the central stage (Screenshot 1)
  renderStage() {
    const step = this.getCurrentStep();
    if (!step) return;

    // Header
    const titleEl = document.getElementById('stage-step-title');
    if (titleEl) {
      titleEl.innerHTML = `${step.title || `Step ${step.id}: ${step.name}`} <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`;
    }

    const descEl = document.getElementById('stage-step-desc');
    if (descEl) {
      descEl.innerText = step.description || "";
    }

    // Jupyter Code Input block
    const promptNumber = step.id || (this.activeStepIdx + 1);
    const inPromptEl = document.getElementById('cell-in-prompt');
    if (inPromptEl) inPromptEl.innerText = `In [${promptNumber}]:`;

    const codeDisplayEl = document.getElementById('cell-code-display');
    if (codeDisplayEl) {
      codeDisplayEl.innerHTML = UI.highlightPython(step.code || "");
    }

    // Output block
    const outPromptEl = document.getElementById('cell-out-prompt');
    if (outPromptEl) outPromptEl.innerText = `Out [${promptNumber}]:`;

    const outWrapperEl = document.getElementById('cell-output-wrapper');
    if (outWrapperEl) {
      if (step.preview_data) {
        outWrapperEl.innerHTML = UI.renderDataFrameTable(step.preview_data);
      } else {
        outWrapperEl.innerHTML = `<div style="padding: 16px; color: var(--text-muted); font-size: 13px;">
          Cell output ready. Execute step to inspect updated dataframe preview.
        </div>`;
      }
    }

    // Prev / Next button states
    const prevBtn = document.getElementById('btn-prev-step');
    if (prevBtn) {
      prevBtn.disabled = this.activeStepIdx === 0;
      prevBtn.style.opacity = this.activeStepIdx === 0 ? "0.5" : "1";
    }

    const nextBtn = document.getElementById('btn-next-step');
    if (nextBtn) {
      const isLast = this.activeStepIdx === (this.blueprint.length - 1);
      nextBtn.innerText = isLast ? "Finish Pipeline ✓" : "Next Step →";
    }
  },

  // Render the Right Inspector (Screenshot 1)
  renderInspector() {
    const step = this.getCurrentStep();
    if (!step) return;

    // Header title
    const insTitle = document.getElementById('inspector-step-title');
    if (insTitle) {
      insTitle.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--primary);"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> ${step.title || `Step ${step.id}: ${step.name}`}`;
    }

    // Recommendation card
    const recomText = document.getElementById('inspector-recom-text');
    if (recomText) recomText.innerText = step.recommendation || "Processing step using optimal hyperparameters.";

    const aiBadge = document.getElementById('inspector-ai-badge');
    if (aiBadge) aiBadge.innerText = step.recommendation_tag || "AI Suggested";

    // Selected Method
    const methodPill = document.getElementById('inspector-method-pill');
    if (methodPill) methodPill.innerText = step.selected_method || "Automated Transformation";

    // Columns Affected
    const colCountEl = document.getElementById('inspector-affected-count');
    const colsCloud = document.getElementById('inspector-tags-cloud');
    const affected = step.columns_affected || [];

    if (colCountEl) colCountEl.innerText = `${affected.length} Columns`;
    if (colsCloud) {
      if (affected.length === 0) {
        colsCloud.innerHTML = `<span class="tag-pill">All features</span>`;
      } else {
        colsCloud.innerHTML = affected.map(col => `<span class="tag-pill">${col}</span>`).join('');
      }
    }

    // Stepper Checklist (10 steps)
    const checklistEl = document.getElementById('inspector-stepper-checklist');
    if (checklistEl) {
      let html = '';
      this.blueprint.forEach((bp, idx) => {
        const isCompleted = idx < this.steps.length && this.steps[idx]?.status === 'completed';
        const isActive = idx === this.activeStepIdx;
        const isSkipped = idx < this.steps.length && this.steps[idx]?.status === 'skipped';

        let iconHtml = '';
        let itemClass = 'stepper-item';
        if (isActive) {
          itemClass += ' active';
          iconHtml = `<svg class="step-icon-active" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>`;
        } else if (isCompleted) {
          itemClass += ' completed';
          iconHtml = `<svg class="step-icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
        } else if (isSkipped) {
          iconHtml = `<span style="color:var(--text-muted); font-size:12px;">⏭</span>`;
        } else {
          iconHtml = `<svg class="step-icon-pending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`;
        }

        html += `<div class="${itemClass}" onclick="Pipeline.goToStep(${idx})">
          <div class="stepper-item-left">
            <span>${iconHtml}</span>
            <span>${bp.id}. ${bp.name}</span>
          </div>
          <span>${isCompleted ? '✓' : ''}</span>
        </div>`;
      });
      checklistEl.innerHTML = html;
    }
  },

  // Update left sidebar progress indicator
  renderSidebarProgress() {
    const total = this.blueprint.length || 10;
    const completedCount = this.steps.filter(s => s.status === 'completed').length;
    const currentStepNum = Math.min(this.activeStepIdx + 1, total);
    const pct = Math.round((completedCount / total) * 100);

    const titleEl = document.getElementById('sidebar-step-counter');
    if (titleEl) titleEl.innerText = `Step ${currentStepNum} of ${total}`;

    const fillEl = document.getElementById('sidebar-progress-fill');
    if (fillEl) fillEl.style.width = `${pct}%`;

    const labelEl = document.getElementById('sidebar-progress-label');
    if (labelEl) labelEl.innerText = `${pct}%`;
  },

  // Step Actions
  async acceptAndContinue() {
    try {
      const resp = await fetch('/api/step-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionData.session_id,
          action: 'accept',
          step_index: this.activeStepIdx
        })
      });
      const data = await resp.json();
      UI.showToast(`Step ${this.activeStepIdx + 1} accepted! Moving to next step.`, 'success');
      this.updateSession(data);
      if (window.App) window.App.refreshDashboardOverview();
    } catch (e) {
      console.error(e);
      UI.showToast('Failed to accept step: ' + e.message, 'error');
    }
  },

  async rejectStep() {
    if (!confirm(`Are you sure you want to skip / reject Step ${this.activeStepIdx + 1}?`)) return;
    try {
      const resp = await fetch('/api/step-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionData.session_id,
          action: 'reject',
          step_index: this.activeStepIdx
        })
      });
      const data = await resp.json();
      UI.showToast(`Step ${this.activeStepIdx + 1} skipped / reverted.`, 'info');
      this.updateSession(data);
      if (window.App) window.App.refreshDashboardOverview();
    } catch (e) {
      console.error(e);
      UI.showToast('Failed to skip step: ' + e.message, 'error');
    }
  },

  async resetCurrentStep() {
    try {
      const resp = await fetch('/api/run-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionData.session_id,
          step_index: this.activeStepIdx,
          params: {}
        })
      });
      const data = await resp.json();
      if (data.step) {
        this.steps[this.activeStepIdx] = data.step;
        this.render();
        UI.showToast(`Step ${this.activeStepIdx + 1} reset to default parameters.`, 'info');
      }
    } catch (e) {
      UI.showToast('Reset failed: ' + e.message, 'error');
    }
  },

  goToStep(idx) {
    if (idx < 0 || idx >= this.blueprint.length) return;
    this.activeStepIdx = idx;
    
    // If step hasn't been executed yet, run it
    if (!this.steps[idx] || this.steps[idx].status !== 'completed') {
      this.runActiveStep();
    } else {
      this.render();
    }
  },

  previousStep() {
    if (this.activeStepIdx > 0) {
      this.goToStep(this.activeStepIdx - 1);
    }
  },

  nextStep() {
    if (this.activeStepIdx < this.blueprint.length - 1) {
      this.goToStep(this.activeStepIdx + 1);
    } else {
      UI.showToast("All pipeline steps completed! Final artifacts ready.", "success");
      if (window.App) window.App.switchView('reports');
    }
  },

  async runActiveStep(customParams = null) {
    try {
      const resp = await fetch('/api/run-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionData.session_id,
          step_index: this.activeStepIdx,
          params: customParams || {}
        })
      });
      const data = await resp.json();
      if (data.step) {
        this.steps[this.activeStepIdx] = data.step;
        this.render();
      }
    } catch (e) {
      console.error(e);
      UI.showToast('Execution error: ' + e.message, 'error');
    }
  },

  // Fast automated "Run All" execution with animated progression
  async runAllSteps() {
    if (this.isRunningAll) return;
    this.isRunningAll = true;
    UI.showToast("Executing automated pipeline at high speed...", "info");

    const total = this.blueprint.length;
    for (let i = 0; i < total; i++) {
      this.activeStepIdx = i;
      this.render();
      try {
        const resp = await fetch('/api/run-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.sessionData.session_id,
            step_index: i
          })
        });
        const data = await resp.json();
        if (data.step) {
          this.steps[i] = data.step;
          this.render();
        }
      } catch (e) {
        console.error(e);
      }
      // Fluid short pause for visual feedback
      await new Promise(r => setTimeout(r, 450));
    }

    this.isRunningAll = false;
    UI.showToast("Pipeline fully executed! All steps verified.", "success");
    if (window.App) window.App.refreshDashboardOverview();
  },

  // Open Modify Step Modal
  openModifyModal() {
    const step = this.getCurrentStep();
    if (!step) return;

    const modal = document.getElementById('modify-step-modal');
    const titleEl = document.getElementById('modify-modal-title');
    const contentEl = document.getElementById('modify-modal-content');

    titleEl.innerText = `Modify ${step.title || step.name}`;
    
    // Dynamic settings based on step type
    let formHtml = '';
    const bp = this.blueprint[this.activeStepIdx];
    const stepType = bp ? bp.type : '';

    if (stepType === 'scaling') {
      formHtml = `
        <label style="font-size:13px; font-weight:600;">Scaling Algorithm:</label>
        <select id="mod-scaling-select" class="cell-type-select" style="width:100%; padding:9px; margin-top:6px;">
          <option value="StandardScaler">StandardScaler (Zero mean, unit variance)</option>
          <option value="MinMaxScaler">MinMaxScaler (Bounded [0, 1])</option>
          <option value="RobustScaler">RobustScaler (Median & Interquartile range)</option>
        </select>
        <p style="font-size:12px; color:var(--text-muted); margin-top:6px;">Use RobustScaler if heavy extreme outliers are present.</p>
      `;
    } else if (stepType === 'outliers') {
      formHtml = `
        <label style="font-size:13px; font-weight:600;">IQR Multiplier Factor:</label>
        <select id="mod-iqr-select" class="cell-type-select" style="width:100%; padding:9px; margin-top:6px;">
          <option value="1.5">1.5 × IQR (Standard threshold)</option>
          <option value="2.0">2.0 × IQR (Moderate threshold)</option>
          <option value="3.0">3.0 × IQR (Extreme outliers only)</option>
        </select>
      `;
    } else if (stepType === 'missing') {
      formHtml = `
        <label style="font-size:13px; font-weight:600;">Numerical Imputation Strategy:</label>
        <select id="mod-num-impute" class="cell-type-select" style="width:100%; padding:9px; margin-top:6px;">
          <option value="mean">Mean Imputation</option>
          <option value="median">Median Imputation (Robust to skewness)</option>
        </select>
      `;
    } else if (stepType === 'selection') {
      formHtml = `
        <label style="font-size:13px; font-weight:600;">Top Features to Retain:</label>
        <input type="number" id="mod-top-k" value="12" min="3" max="50" style="width:100%; padding:9px; border:1px solid var(--border-color); border-radius:6px; margin-top:6px; background:var(--bg-card); color:var(--text-main);">
      `;
    } else {
      formHtml = `
        <p style="font-size:13px; color:var(--text-muted);">
          Standard execution parameters are currently optimized for this step. Click re-run to refresh.
        </p>
      `;
    }

    contentEl.innerHTML = formHtml;
    modal.classList.add('active');
  },

  closeModifyModal() {
    const modal = document.getElementById('modify-step-modal');
    modal.classList.remove('active');
  },

  async applyStepModification() {
    const bp = this.blueprint[this.activeStepIdx];
    const stepType = bp ? bp.type : '';
    const params = {};

    if (stepType === 'scaling') {
      params.method = document.getElementById('mod-scaling-select')?.value || 'StandardScaler';
    } else if (stepType === 'outliers') {
      params.factor = parseFloat(document.getElementById('mod-iqr-select')?.value || '1.5');
    } else if (stepType === 'missing') {
      params.numeric_strategy = document.getElementById('mod-num-impute')?.value || 'mean';
    } else if (stepType === 'selection') {
      params.top_k = parseInt(document.getElementById('mod-top-k')?.value || '12', 10);
    }

    this.closeModifyModal();
    UI.showToast("Re-running step with updated parameters...", "info");
    await this.runActiveStep(params);
    UI.showToast("Step parameters updated!", "success");
    if (window.App) window.App.refreshDashboardOverview();
  }
};

window.Pipeline = Pipeline;
