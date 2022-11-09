

(async function() {

	const core = require('@actions/core');
	const { Octokit } = require("@octokit/core");

	const octokit = new Octokit({ auth: core.getInput('token', { required: false }) });
	const [ owner, repo ] = core.getInput('repo', { required: false }).split("/");

	try {
		await octokit.request("GET /repos/{owner}/{repo}", {
			owner,
			repo,
		})
	} catch( e ) {
		await octokit.request("POST /orgs/{org}/repos", {
			org: owner,
			name: repo,
			private: true,
		})
	}

})()
