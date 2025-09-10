set clusterId=fake-connector
set serviceName=fake-connector-srv
set regionName=ap-northeast-2

aws ecs update-service --cluster %clusterId% --service %serviceName% --region %regionName% --force-new-deployment --profile faker

pause