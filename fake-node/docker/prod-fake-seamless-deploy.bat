set clusterId=fake-seamless
set serviceName=fake-seamless-srv
set regionName=ap-southeast-1

aws ecs update-service --cluster %clusterId% --service %serviceName% --region %regionName% --force-new-deployment --profile faker

pause