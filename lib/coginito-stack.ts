import { CfnOutput, SecretValue, Stack, StackProps } from "aws-cdk-lib";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { IdentityPool, UserPoolAuthenticationProvider } from "aws-cdk-lib/aws-cognito-identitypool";
import { Construct } from "constructs";

export class CognitoStack extends Stack {

    public readonly userPoolId: CfnOutput;
        
    public readonly userPoolClientId: CfnOutput;

    public readonly identityPoolId: CfnOutput;

    public readonly userPoolArn: CfnOutput;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Create User Pool
        const userPool = new UserPool(this, 'UserPoolWebApp', {
            userPoolName: 'UserPoolWebApp',
            selfSignUpEnabled: true, // Allow users to sign up
            signInAliases: { email: true}, // Users can sign in with email
            autoVerify: { email: true }, // Verify email addresses by sending a verification code
            /*
            standardAttributes: {
                email: {
                    required: true,
                    mutable: false
                }
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY
            */
        });

        const userPoolClient = new UserPoolClient(
            this, 
            'UserPoolWebAppClient', 
            {
                userPool,
                generateSecret: false
            }
        );

         // create an Identity Pool 
        const identityPool = new IdentityPool(this, 'IdentityPoolWebApp', {
            allowUnauthenticatedIdentities: true,
            identityPoolName: 'IdentityPoolWebApp',
            authenticationProviders: {
                userPools: [
                    new UserPoolAuthenticationProvider({
                        userPool: userPool,
                        userPoolClient: userPoolClient
                    })
                ]
            }
        });

        
        this.userPoolId = new CfnOutput(this, 'CFUserPoolTodoWebApp', {
            value: userPool.userPoolId
        });
        
        this.userPoolClientId = new CfnOutput(this, 'CFUserPoolClientTodoWebApp', {
            value: userPoolClient.userPoolClientId
        });

        this.identityPoolId = new CfnOutput(this, 'CFIdentityPoolTodoWebApp', {
            value: identityPool.identityPoolId
        });

        this.userPoolArn = new CfnOutput(this, 'CFUserPoolArnTodoWebApp', {
            value: userPool.userPoolArn
        });


    }
}