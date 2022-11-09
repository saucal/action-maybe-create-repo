

(async function() {

	const core = require('@actions/core');
	const { Octokit } = require("@octokit/core");

	// Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
	const octokit = new Octokit({ auth: core.getInput('token', { required: false }) });

	const response = await octokit.request("GET /orgs/{org}/repos", {
		org: "saucal",
		type: "private",
	});

	console.log( response );

})()
