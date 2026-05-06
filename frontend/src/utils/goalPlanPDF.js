import jsPDF from 'jspdf';

export function generateGoalPlanPDF(goal, plan) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 18, cw = W - M * 2;
  let y = 0;

  const addPage = () => { doc.addPage(); y = 20; };
  const checkY = (need = 20) => { if (y + need > 270) addPage(); };

  // ── Header ──────────────────────────────────────
  doc.setFillColor(108, 99, 255);
  doc.rect(0, 0, W, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('StudyVerse', M, 16);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Goal Implementation Plan', M, 25);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, M, 34);

  y = 54;
  doc.setTextColor(30, 30, 50);

  // ── Goal Title ──────────────────────────────────
  doc.setFillColor(245, 244, 255);
  doc.roundedRect(M, y, cw, 20, 4, 4, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text('Goal:', M + 6, y + 8);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(12);
  const goalLines = doc.splitTextToSize(goal, cw - 30);
  doc.text(goalLines, M + 28, y + 8);
  y += 26;

  // ── Overview ────────────────────────────────────
  if (plan.overview) {
    checkY(28);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(108, 99, 255);
    doc.text('Overview', M, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(60, 60, 80);
    const lines = doc.splitTextToSize(plan.overview, cw);
    doc.text(lines, M, y); y += lines.length * 5 + 8;
  }

  // Timeline pill
  if (plan.timeline) {
    checkY(12);
    doc.setFillColor(230, 244, 255);
    doc.roundedRect(M, y, 60, 10, 3, 3, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(9, 132, 227);
    doc.text(`⏱ Timeline: ${plan.timeline}`, M + 4, y + 6.5);
    y += 16;
  }

  // ── Phases ──────────────────────────────────────
  if (plan.phases?.length) {
    checkY(16);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(108, 99, 255);
    doc.text('Implementation Phases', M, y); y += 8;

    plan.phases.forEach((ph) => {
      checkY(30);
      doc.setFillColor(250, 249, 255);
      const phHeight = 14 + (ph.tasks?.length || 0) * 6 + 6;
      doc.roundedRect(M, y, cw, phHeight, 3, 3, 'F');
      doc.setFillColor(108, 99, 255);
      doc.roundedRect(M, y, 3, phHeight, 1.5, 1.5, 'F');

      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30, 30, 50);
      doc.text(`Phase ${ph.phase}: ${ph.name}`, M + 8, y + 8);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120, 120, 140);
      doc.text(ph.duration || '', M + 8, y + 14);

      let ty = y + 20;
      (ph.tasks || []).forEach(task => {
        doc.setTextColor(50, 50, 70); doc.setFontSize(9);
        const tl = doc.splitTextToSize(`• ${task}`, cw - 20);
        doc.text(tl, M + 12, ty);
        ty += tl.length * 5;
      });
      y += phHeight + 6;
    });
  }

  // ── Milestones ──────────────────────────────────
  if (plan.milestones?.length) {
    checkY(20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(108, 99, 255);
    doc.text('Key Milestones', M, y); y += 8;
    plan.milestones.forEach(m => {
      checkY(10);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 184, 148);
      doc.text(`Week ${m.week}:`, M, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 70);
      const ml = doc.splitTextToSize(m.milestone, cw - 25);
      doc.text(ml, M + 24, y);
      y += ml.length * 5 + 4;
    });
    y += 4;
  }

  // ── Resources ───────────────────────────────────
  if (plan.resources?.length) {
    checkY(20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(108, 99, 255);
    doc.text('Resources', M, y); y += 8;
    plan.resources.forEach(r => {
      checkY(10);
      doc.setFillColor(240, 248, 255);
      doc.roundedRect(M, y, cw, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(9, 132, 227);
      doc.text(`[${(r.type || 'resource').toUpperCase()}]`, M + 4, y + 7.5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 50);
      doc.text(`${r.name}`, M + 32, y + 7.5);
      if (r.description) {
        doc.setTextColor(120, 120, 140);
        doc.text(` — ${r.description}`, M + 32 + doc.getTextWidth(r.name) + 2, y + 7.5);
      }
      y += 16;
    });
  }

  // ── Daily Routine ───────────────────────────────
  if (plan.dailyRoutine) {
    checkY(24);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(108, 99, 255);
    doc.text('Daily Routine', M, y); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(60, 60, 80);
    const rl = doc.splitTextToSize(plan.dailyRoutine, cw);
    doc.text(rl, M, y); y += rl.length * 5 + 10;
  }

  // ── Success Metrics ─────────────────────────────
  if (plan.successMetrics?.length) {
    checkY(20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(108, 99, 255);
    doc.text('Success Metrics', M, y); y += 8;
    plan.successMetrics.forEach(metric => {
      checkY(8);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(50, 50, 70);
      doc.text(`✓ ${metric}`, M + 4, y); y += 7;
    });
  }

  // ── Footer ───────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(245, 244, 255);
    doc.rect(0, 285, W, 12, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 150, 170);
    doc.text('StudyVerse — AI-Powered Learning Platform', M, 292);
    doc.text(`Page ${i} of ${pageCount}`, W - M, 292, { align: 'right' });
  }

  doc.save(`Goal_Plan_${goal.replace(/[^a-z0-9]/gi, '_').slice(0, 30)}.pdf`);
}
