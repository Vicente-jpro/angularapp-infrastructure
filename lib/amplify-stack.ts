import { CfnOutput, SecretValue, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

import { 
    App, 
    GitHubSourceCodeProvider,
    RedirectStatus
} from "@aws-cdk/aws-amplify-alpha";


export interface AmplifyStackProps extends StackProps {

}

export class AmplifyHostingStack extends Stack {
    constructor(scope: Construct, id: string, props?: AmplifyStackProps) {
        super(scope, id, props);

        // Create the Amplify application 
        const amplifyApp = new App(this, `AngularApp`, {
            sourceCodeProvider: new GitHubSourceCodeProvider({
                owner: 'vicente-jpro',
                repository: 'angularapp',
                oauthToken: SecretValue.secretsManager('GITHUB_ACCESS_TOKEN2'),
        }), 
        environmentVariables: {
            'REGION': this.region
        }
        });

        // Add a branch to the Amplify application
        const main = amplifyApp.addBranch('main',{
            autoBuild: true,
            stage: 'PRODUCTION'
        });

        amplifyApp.addCustomRule({
            source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|eot|ttf|map)$)([^.]+$)/>',
            target: '/index.html',
            status: RedirectStatus.REWRITE
        });


        new CfnOutput(this, 'AmplifyAppName', {
            value: amplifyApp.appName
        });

        new CfnOutput(this, 'AmplifyAppUrl', {
            value: `http://main.${amplifyApp.defaultDomain}`
        });
    }
}