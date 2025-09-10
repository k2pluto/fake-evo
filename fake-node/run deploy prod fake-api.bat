node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc
cmd /k sls deploy --config serverless.fake-api.yml --stage prod --aws-profile faker

pause