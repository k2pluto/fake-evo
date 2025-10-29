#!/bin/bash

# 배포할 파일
FILE="fake-out-final.tar.gz"

echo "========================================="
echo "배포 시작: $FILE"
echo "========================================="

# 각 서버에 순차적으로 배포 (비밀번호 입력 가능)
echo "[1/10] evoserver01@49.254.149.8"
scp "$FILE" evoserver01@49.254.149.8:/home/evoserver01/

echo "[2/10] evoserver02@124.198.28.33"
scp "$FILE" evoserver02@124.198.28.33:/home/evoserver02/

echo "[3/10] evoserver03@49.254.182.72"
scp "$FILE" evoserver03@49.254.182.72:/home/evoserver03/

echo "[4/10] evoserver04@183.78.156.28"
scp "$FILE" evoserver04@183.78.156.28:/home/evoserver04/

echo "[5/10] evoserver05@125.7.129.178"
scp "$FILE" evoserver05@125.7.129.178:/home/evoserver05/

echo "[6/10] evoserver06@125.7.170.21"
scp "$FILE" evoserver06@125.7.170.21:/home/evoserver06/

echo "[7/10] evoserver07@125.7.176.180"
scp "$FILE" evoserver07@125.7.176.180:/home/evoserver07/

echo "[8/10] evoserver08@203.109.18.112"
scp "$FILE" evoserver08@203.109.18.112:/home/evoserver08/

echo "[9/10] evoserver09@183.78.142.37"
scp "$FILE" evoserver09@183.78.142.37:/home/evoserver09/

echo "[10/10] evoserver10@202.126.115.197"
scp "$FILE" evoserver10@202.126.115.197:/home/evoserver10/

echo "========================================="
echo "배포 완료"
echo "========================================="
