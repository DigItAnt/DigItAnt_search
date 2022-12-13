import { UrlDecoderPipe } from './url-decoder.pipe';

describe('UrlDecoderPipe', () => {
  it('create an instance', () => {
    const pipe = new UrlDecoderPipe();
    expect(pipe).toBeTruthy();
  });
});
