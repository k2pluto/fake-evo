async function main() {
  console.log('main')
  const regex = /\${window\.EVO_CDN}\/frontend\/cvi\/evo-video-components/g
  const str = 'asdf ${window.EVO_CDN}/frontend/cvi/evo-video-components sdfdsf'

  const matchRes = str.match(regex)
  console.log('matchRes', JSON.stringify(matchRes))

  const res = str.replace(regex, `https://eee.com/video/frontend/cvi/evo-video-components`)
  console.log(res)
}

main().catch((err) => {
  console.log(err)
})
