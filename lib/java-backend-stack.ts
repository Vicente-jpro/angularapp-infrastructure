import { CfnOutput, Stack, StackProps, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";

import {
    Cluster,
    ContainerImage,
    TaskDefinition,
    Compatibility,
    NetworkMode,
    LogDriver,
    Protocol as EcsProtocol,
    FargateService,
} from "aws-cdk-lib/aws-ecs";

import {
    ApplicationLoadBalancer,
    ApplicationProtocol,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";

import {
    Repository,
} from "aws-cdk-lib/aws-ecr";

import {
    Vpc,
    SecurityGroup,
    Peer,
    Port,
} from "aws-cdk-lib/aws-ec2";

import {
    LogGroup,
    RetentionDays,
} from "aws-cdk-lib/aws-logs";

interface JavaBackendStackProps extends StackProps {
    applicationName?: string;
    containerPort?: number;
    desiredCount?: number;
    cpu?: number;
    memory?: number;
}

export class JavaBackendStack extends Stack {
    public readonly repository: Repository;
    public readonly loadBalancer: ApplicationLoadBalancer;

    constructor(scope: Construct, id: string, props?: JavaBackendStackProps) {
        super(scope, id, props);

        const applicationName = props?.applicationName || 'java-app';
        const containerPort = props?.containerPort || 8080;
        const desiredCount = props?.desiredCount || 1;
        const cpu = props?.cpu || 256;
        const memory = props?.memory || 256;

        // Create VPC for the application
        const vpc = new Vpc(this, 'JavaAppVpc', {
            maxAzs: 2,
            natGateways: 1,
        });

        // Create ECR Repository for Docker images
        this.repository = new Repository(this, 'JavaAppRepository', {
            repositoryName: applicationName.toLowerCase(),
            // On production you need to uncomment this line.
            // removalPolicy: RemovalPolicy.RETAIN,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        // Create Security Group for ALB
        const albSecurityGroup = new SecurityGroup(this, 'ALBSecurityGroup', {
            vpc,
            description: 'Security group for ALB',
            allowAllOutbound: true,
        });
        albSecurityGroup.addIngressRule(
            Peer.anyIpv4(),
            Port.tcp(80),
            'Allow HTTP'
        );
        albSecurityGroup.addIngressRule(
            Peer.anyIpv4(),
            Port.tcp(443),
            'Allow HTTPS'
        );

        // Create Security Group for ECS Tasks
        const ecsSecurityGroup = new SecurityGroup(this, 'EcsSecurityGroup', {
            vpc,
            description: 'Security group for ECS tasks',
            allowAllOutbound: true,
        });
        ecsSecurityGroup.addIngressRule(
            albSecurityGroup,
            Port.tcp(containerPort),
            'Allow traffic from ALB'
        );

        // Create ECS Cluster
        const cluster = new Cluster(this, 'JavaAppCluster', {
            vpc,
            containerInsights: true,
        });

        // Create CloudWatch Log Group for container logs
        const logGroup = new LogGroup(this, 'JavaAppLogGroup', {
            logGroupName: `/ecs/${applicationName}`,
            retention: RetentionDays.ONE_MONTH,
        });

        // Create Task Definition
        const taskDefinition = new TaskDefinition(this, 'JavaAppTaskDefinition', {
            compatibility: Compatibility.FARGATE,
            networkMode: NetworkMode.AWS_VPC,
            cpu: cpu.toString(),
            memoryMiB: memory.toString(),
        });

        // Add container to task definition
        const container = taskDefinition.addContainer('JavaAppContainer', {
            image: ContainerImage.fromEcrRepository(this.repository, 'latest'),
            portMappings: [
                {
                    containerPort,
                    hostPort: containerPort,
                    protocol: EcsProtocol.TCP,
                }
            ],
            logging: LogDriver.awsLogs({
                logGroup,
                streamPrefix: applicationName,
            }),
            environment: {
                REGION: this.region,
                JAVA_OPTS: '-Xmx128m -Xms64m',
            },
        });

        // Create ECS Service
        const service = new FargateService(this, 'JavaAppService', {
            cluster,
            taskDefinition,
            desiredCount,
            securityGroups: [ecsSecurityGroup],
            assignPublicIp: false,
        });

        // Create Application Load Balancer
        this.loadBalancer = new ApplicationLoadBalancer(this, 'JavaAppALB', {
            vpc,
            internetFacing: true,
            securityGroup: albSecurityGroup,
            loadBalancerName: `${applicationName}-alb`,
        });

        // Add listener and target group
        const listener = this.loadBalancer.addListener('JavaAppListener', {
            port: 80,
            protocol: ApplicationProtocol.HTTP,
        });

        listener.addTargets('JavaAppTargets', {
            targets: [service],
            port: containerPort,
            protocol: ApplicationProtocol.HTTP,
            healthCheck: {
                enabled: true,
                path: '/actuator/health',
                interval: Duration.seconds(30),
                timeout: Duration.seconds(5),
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 3,
            },
        });

        // Enable auto-scaling (only if desiredCount > 1)
        if (desiredCount > 1) {
            const scaling = service.autoScaleTaskCount({
                minCapacity: desiredCount,
                maxCapacity: desiredCount * 2,
            });

            scaling.scaleOnCpuUtilization('CpuScaling', {
                targetUtilizationPercent: 70,
            });

            scaling.scaleOnMemoryUtilization('MemoryScaling', {
                targetUtilizationPercent: 80,
            });
        }

        // Outputs
        new CfnOutput(this, 'ECRRepositoryUri', {
            value: this.repository.repositoryUri,
            description: 'ECR Repository URI for Java application',
        });

        new CfnOutput(this, 'ALBUrl', {
            value: `http://${this.loadBalancer.loadBalancerDnsName}`,
            description: 'URL of the Application Load Balancer',
        });

        new CfnOutput(this, 'ECSClusterName', {
            value: cluster.clusterName,
            description: 'ECS Cluster name',
        });

        new CfnOutput(this, 'ECSServiceName', {
            value: service.serviceName,
            description: 'ECS Service name',
        });
    }
}
