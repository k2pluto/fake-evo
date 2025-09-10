const agentCodeDict = {
  aab: 1,
  aaa: 1,
  tab: 1,
  taa: 1,
  tac: 1,
  tag: 1,
  tbg: 1,
  tgg: 1,
  tcg: 1,
  teg: 1,
  bbc: 1,
  rra: 1,
  rrc: 1,
  rrg: 1,
  eer: 1,
  aau: 1,
  fag: 1,
  faa: 1,
  fac: 1,
  zzy: 1,
  zzz: 1,
  zzu: 1,
}

const agentCodes = Object.keys(agentCodeDict)

const commonWordDict = {
  speed: 1,
  six: 1,
  apple: 1,
  bear: 1,
  banana: 1,
  king: 1,
  general: 1,
  dragon: 1,
  kaiser: 1,
  card: 1,
  master: 1,
  test: 1,
  ttest: 1,
  tttest: 1,
  vip: 1,
  vvip: 1,
  vvvip: 1,
  code: 1,
  gene: 1,
  tuna: 1,
  january: 1,
  febrary: 1,
}

const commonWords = Object.keys(commonWordDict)

const uniqueWordDict = {
  kimjae: 1,
  ulsan: 1,
  seoul: 1,
  busan: 1,
  daegu: 1,
  mokpo: 1,
  mogpo: 1,
  yeosu: 1,
  pohang: 1,
  gwangju: 1,
  daejeon: 1,
  yeoju: 1,
  gangleung: 1,
  donghae: 1,
  dokdo: 1,
  sokcho: 1,
  socosc: 1,
  incheon: 1,
  itaewon: 1,
  ewang: 1,
  guriguri: 1,
  bucheon: 1,
  sihwung: 1,
  ansan: 1,
  gwang: 1,
  yongin: 1,
  suwon: 1,
  kim: 1,
  park: 1,
  sung: 1,
  lim: 1,
  heung: 1,
  hong: 1,
  sadmi: 1,
  yun: 1,
  gil: 1,
  giljae: 1,
  yuri: 1,
}

const uniqueWords = Object.keys(uniqueWordDict)

function randomElement<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomNumber(maxValue: number) {
  return Math.floor(Math.random() * maxValue)
}

const ganeratedDict: { [username: string]: 1 } = {}

export function generateUsername() {
  const idTypes = randomNumber(7)
  switch (idTypes) {
    case 0:
      return randomElement(commonWords) + randomElement(commonWords)
    case 1:
      return randomElement(commonWords) + randomElement(uniqueWords)
    case 2:
      return randomElement(uniqueWords) + randomElement(commonWords)
    case 3:
      return randomElement(commonWords) + randomElement(uniqueWords) + randomNumber(100)
    case 4:
      return randomElement(uniqueWords) + randomElement(commonWords) + randomNumber(100)
    case 5:
      return randomElement(commonWords) + randomNumber(100)
    case 6:
      return randomElement(uniqueWords) + randomNumber(100)
  }

  return randomElement(commonWords) + randomElement(uniqueWords) + randomNumber(100)
}

export function generateAgentUsername() {
  while (true) {
    let agentUsername = randomElement(agentCodes) + generateUsername()

    if (agentUsername.length > 12) {
      agentUsername = agentUsername.substring(0, 12)
    }

    if (ganeratedDict[agentUsername] === 1) {
      continue
    }

    ganeratedDict[agentUsername] = 1

    return agentUsername
  }
}
