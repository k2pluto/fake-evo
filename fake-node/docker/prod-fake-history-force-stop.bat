set clusterId=fake-history
set serviceName=service-fake-history
set regionName=ap-northeast-1

@for /F "delims=" %%i in ('aws ecs list-tasks --cluster %clusterId% --region %regionName% --profile faker --service-name %serviceName% --desired-status RUNNING --output text --query taskArns[*]') do @(
    aws ecs stop-task --cluster %clusterId% --task %%i --region %regionName% --profile faker --reason "Stopped by kill script"
)

pause