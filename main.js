

(async function() {

	const core = require('@actions/core');
	const { Octokit } = require("@octokit/core");

	const octokit = new Octokit({ auth: core.getInput('token', { required: false }) });
	const [ owner, repo ] = core.getInput('repo', { required: false }).split("/");

	const response = await octokit.request("GET /repos/{owner}/{repo}", {
		owner,
		repo,
	});

	console.log( response );

})()
