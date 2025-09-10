set clusterId=fake-api-green
set serviceName=fake-api-green-srv
set regionName=ap-northeast-1

aws ecs update-service --cluster %clusterId% --service %serviceName% --region %regionName% --force-new-deployment --profile faker

pause