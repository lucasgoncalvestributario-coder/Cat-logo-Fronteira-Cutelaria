// Voice assistant helper for Vani's Admin daily report (Web Speech API)

export interface VoiceReportMetrics {
  birthdaysCount: number;
  soldOutCount: number;
  fidelityCount: number;
  inactiveCount: number;
}

const VOICE_REPORT_KEY = 'vani_voice_report_last_date';

export function hasPlayedVoiceToday(): boolean {
  if (typeof window === 'undefined') return true;
  const todayStr = new Date().toISOString().split('T')[0];
  return localStorage.getItem(VOICE_REPORT_KEY) === todayStr;
}

export function markVoicePlayedToday(): void {
  if (typeof window === 'undefined') return;
  const todayStr = new Date().toISOString().split('T')[0];
  localStorage.setItem(VOICE_REPORT_KEY, todayStr);
}

export function stopVoiceReport(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function playVaniVoiceReport(metrics: VoiceReportMetrics, force: boolean = false): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  // If not forced and already played today, don't auto-speak again
  if (!force && hasPlayedVoiceToday()) {
    return;
  }

  stopVoiceReport();

  const currentHour = new Date().getHours();
  let timeGreeting = 'Bom dia';
  if (currentHour >= 12 && currentHour < 18) {
    timeGreeting = 'Boa tarde';
  } else if (currentHour >= 18 || currentHour < 5) {
    timeGreeting = 'Boa noite';
  }

  const alertParts: string[] = [];

  if (metrics.birthdaysCount > 0) {
    alertParts.push(
      `${metrics.birthdaysCount} ${metrics.birthdaysCount === 1 ? 'cliente aniversariante' : 'clientes aniversariantes'}`
    );
  }

  if (metrics.soldOutCount > 0) {
    alertParts.push(
      `${metrics.soldOutCount} ${metrics.soldOutCount === 1 ? 'modelo de faca esgotado' : 'modelos de faca esgotados'}`
    );
  }

  if (metrics.fidelityCount > 0) {
    alertParts.push(
      `${metrics.fidelityCount} ${metrics.fidelityCount === 1 ? 'cliente com meta de fidelidade batida para ganhar brinde' : 'clientes com metas de fidelidade batidas para ganhar brinde'}`
    );
  }

  let speechText = '';

  if (alertParts.length > 0) {
    const alertsSentence = alertParts.join(', e ');
    speechText = `Olá, Vani! ${timeGreeting}! Aqui está o seu relatório do dia. Atenção: você tem ${alertsSentence}. Tudo já está destacado no seu painel para você conferir. Desejo ótimas vendas e um excelente trabalho!`;
  } else {
    speechText = `Olá, Vani! ${timeGreeting}! Tudo está 100% em ordem por aqui. Nenhum alerta pendente no momento. Desejo um ótimo dia e excelentes vendas para você!`;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick best Portuguese voice if available
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang === 'pt-BR' || v.lang.startsWith('pt'));
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    window.speechSynthesis.speak(utterance);
    markVoicePlayedToday();
  } catch (err) {
    console.warn('Speech synthesis failed or not allowed:', err);
  }
}
