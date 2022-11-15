

(async function() {

	const core = require('@actions/core');
	const { Octokit } = require("@octokit/core");

	const inputToken = core.getInput('token', { required: false });
	const inputRepo = core.getInput('repo', { required: false });
	const inputSuffix = core.getInput('repo-suffix', { required: false });

	const octokit = new Octokit({ auth: inputToken });
	const [ owner, repo ] = inputRepo.split("/");
	const targetRepo = repo + '-' + inputSuffix;

	try {
		await octokit.request("GET /repos/{owner}/{repo}", {
			owner,
			repo: targetRepo,
		});
	} catch( e ) {
		const { data: sourceRepo } = await octokit.request("GET /repos/{owner}/{repo}", {
			owner,
			repo,
		});

		await octokit.request('POST /orgs/{org}/repos', {
			org: owner,
			name: targetRepo,
			'private': sourceRepo.private,
		})
	}

	core.setOutput( 'repo', [owner, targetRepo].join('/') );

})()
