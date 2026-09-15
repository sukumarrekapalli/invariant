import assert from 'node:assert/strict';
import test from 'node:test';
import { eld } from 'eld/extrasmall';

test('shipped statistical model identifies different language families without a configured subset', () => {
  const english = eld.detect('A longer English paragraph gives the local detector enough evidence to identify the language reliably.');
  const telugu = eld.detect('ఉత్పత్తి వివరాలను విడుదలకు ముందు జాగ్రత్తగా తనిఖీ చేయండి మరియు అవసరమైన మార్పులు చేయండి.');
  const kannada = eld.detect('ಬರವಣಿಗೆಯನ್ನು ಹಂಚಿಕೊಳ್ಳುವ ಮೊದಲು ಗೌಪ್ಯತೆ ಮತ್ತು ಸ್ಪಷ್ಟತೆಯನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಪರಿಶೀಲಿಸಿ.');
  assert.equal(english.language, 'en');
  assert.equal(telugu.language, 'te');
  assert.equal(kannada.language, 'kn');
});

