import { CfnOutput, SecretValue, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

import { 
    App, 
    GitHubSourceCodeProvider,
    RedirectStatus
} from "@aws-cdk/aws-amplify-alpha";


interface HellowordStackProps extends StackProps {

}

export class HellowordStack extends Stack {
    constructor(scope: Construct, id: string, props?: HellowordStackProps) {
        super(scope, id, props);

        // Create the Amplify application 
        const amplifyApp = new App(this, `HellowordApp`, {
            sourceCodeProvider: new GitHubSourceCodeProvider({
                owner: 'vicente-jpro',
                repository: 'helloword',
                oauthToken: SecretValue.secretsManager('GITHUB_ACCESS_TOKEN3'),
        }), 
        environmentVariables: {
            REGION: this.region,
        },
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


        new CfnOutput(this, 'HellowordAppName', {
            value: amplifyApp.appName
        });

        new CfnOutput(this, 'HellowordAppUrl', {
            value: `http://main.${amplifyApp.defaultDomain}`
        });
    }
}