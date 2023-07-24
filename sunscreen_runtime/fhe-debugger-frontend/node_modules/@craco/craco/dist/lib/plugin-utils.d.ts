interface ConfigError {
    message: string;
    packageName?: string;
    githubRepo?: string;
    githubIssueQuery?: string;
}
export declare function gitHubIssueUrl(repo: string, query?: string): string;
export declare function throwUnexpectedConfigError({ message, packageName, githubRepo: repo, githubIssueQuery: query, }: ConfigError): void;
export {};
