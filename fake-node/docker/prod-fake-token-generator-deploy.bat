set clusterId=fake-token-generator
set serviceName=fake-token-generator-srv
set regionName=ap-northeast-1

aws ecs update-service --cluster %clusterId% --service %serviceName% --region %regionName% --force-new-deployment --profile faker

pause