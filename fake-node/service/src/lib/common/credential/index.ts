export const plutoCredential = {
  credentials: {
    accessKeyId: process.env.AWS_PLUTO_KEY_ID,
    secretAccessKey: process.env.AWS_PLUTO_SECRET_KEY,
  },
  region: 'ap-northeast-1',
}

export const fakeCredential = {
  credentials: {
    accessKeyId: process.env.AWS_FAKE_KEY_ID,
    secretAccessKey: process.env.AWS_FAKE_SECRET_KEY,
  },
}
