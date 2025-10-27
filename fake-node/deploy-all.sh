#!/bin/bash

# 배포할 파일
FILE="fake-out-final.tar.gz"

echo "========================================="
echo "배포 시작: $FILE"
echo "========================================="

# 각 서버에 순차적으로 배포 (비밀번호 입력 가능)
echo "[1/10] evoserver01@124.198.9.76"
scp "$FILE" evoserver01@124.198.9.76:/home/evoserver01/

echo "[2/10] evoserver02@121.126.3.2"
scp "$FILE" evoserver02@121.126.3.2:/home/evoserver02/

echo "[3/10] evoserver03@203.109.3.36"
scp "$FILE" evoserver03@203.109.3.36:/home/evoserver03/

echo "[4/10] evoserver04@49.254.10.20"
scp "$FILE" evoserver04@49.254.10.20:/home/evoserver04/

echo "[5/10] evoserver05@115.144.18.192"
scp "$FILE" evoserver05@115.144.18.192:/home/evoserver05/

echo "[6/10] evoserver06@115.144.61.203"
scp "$FILE" evoserver06@115.144.61.203:/home/evoserver06/

echo "[7/10] evoserver07@49.254.156.70"
scp "$FILE" evoserver07@49.254.156.70:/home/evoserver07/

echo "[8/10] evoserver08@115.144.29.96"
scp "$FILE" evoserver08@115.144.29.96:/home/evoserver08/

echo "[9/10] evoserver09@49.254.158.187"
scp "$FILE" evoserver09@49.254.158.187:/home/evoserver09/

echo "[10/10] evoserver10@203.109.4.238"
scp "$FILE" evoserver10@203.109.4.238:/home/evoserver10/

echo "========================================="
echo "배포 완료"
echo "========================================="
