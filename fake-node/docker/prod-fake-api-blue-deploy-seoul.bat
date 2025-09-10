set clusterId=fake-api-blue
set serviceName=fake-api-blue-srv
set regionName=ap-northeast-2

aws ecs update-service --cluster %clusterId% --service %serviceName% --region %regionName% --force-new-deployment --profile faker

pause