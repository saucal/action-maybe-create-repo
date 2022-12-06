

(async function () {

	const core = require('@actions/core');
	const { Octokit } = require("@octokit/core");

	const inputToken = core.getInput('token', { required: false });
	const inputRepo = core.getInput('repo', { required: false });
	const inputSuffix = core.getInput('repo-suffix', { required: false });

	const octokit = new Octokit({ auth: inputToken });
	const [owner, repo] = inputRepo.split("/");
	const targetRepo = repo + '-' + inputSuffix;

	try {
		await octokit.request("GET /repos/{owner}/{repo}", {
			owner,
			repo: targetRepo,
		});
	} catch (e) {
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

	function diffBy(prop, base, ...diffs) {
		let ret = base;
		diffs.forEach((diff) => {
			ret = ret.filter((item) => {
				for (var i in diff) {
					if (diff[i][prop] == item[prop]) {
						return false
					}
				}

				return true;
			})
		})
		return ret;
	}

	async function getCollaborators(owner, repo) {
		let { data: orgAdmins } = await octokit.request('GET /orgs/{org}/members{?filter,role,per_page,page}', {
			org: owner,
			role: 'admin'
		});

		let { data: collaborators } = await octokit.request('GET /repos/{owner}/{repo}/collaborators{?affiliation,permission,per_page,page}', {
			owner: owner,
			repo: repo,
			affiliation: 'direct'
		});

		collaborators = diffBy('login', collaborators, orgAdmins);

		let { data: repoTeams } = await octokit.request('GET /repos/{owner}/{repo}/teams{?per_page,page}', {
			owner: owner,
			repo: repo
		});

		for (var i in repoTeams) {
			let { data: teamMembers } = await octokit.request('GET /orgs/{org}/teams/{team_slug}/members{?role,per_page,page}', {
				org: owner,
				team_slug: repoTeams[i].slug
			})
			var teamPermissions = repoTeams[i].permissions;

			collaborators = collaborators.filter((item) => {
				for (var i in teamMembers) {
					if (teamMembers[i].login == item.login && JSON.stringify(teamPermissions) == JSON.stringify(item.permissions)) {
						return false;
					}
				}

				return true;
			});
		}

		return { teams: repoTeams, collaborators };
	}

	let { teams: currentTeams, collaborators: currentCollaborators } = await getCollaborators(owner, repo);
	let { teams: targetTeams, collaborators: targetCollaborators } = await getCollaborators(owner, targetRepo);

	let removeTeams = diffBy('id', targetTeams, currentTeams);
	let removeCollaborators = diffBy('login', targetCollaborators, currentCollaborators);

	for (var i in currentTeams) {
		console.log("Ensuring team " + currentTeams[i].name + " has read access to the repo.");
		await octokit.request('PUT /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}', {
			org: owner,
			team_slug: currentTeams[i].slug,
			owner: owner,
			repo: targetRepo,
			permission: 'pull'
		});
	}
	for (var i in currentCollaborators) {
		console.log("Ensuring user " + currentCollaborators[i].login + " has read access to the repo.");
		await octokit.request('PUT /repos/{owner}/{repo}/collaborators/{username}', {
			owner: owner,
			repo: targetRepo,
			username: currentCollaborators[i].login,
			permission: 'pull'
		})
	}

	for (var i in removeTeams) {
		console.log("Ensuring team " + removeTeams[i].name + " doesn't have access anymore.");
		await octokit.request('DELETE /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}', {
			org: owner,
			team_slug: removeTeams[i].slug,
			owner: owner,
			repo: targetRepo
		})
	}

	for (var i in removeCollaborators) {
		console.log("Ensuring user " + removeCollaborators[i].login + " doesn't have access anymore.");
		await octokit.request('DELETE /repos/{owner}/{repo}/collaborators/{username}', {
			owner: owner,
			repo: targetRepo,
			username: removeCollaborators[i].login
		})
	}

	core.setOutput('repo', [owner, targetRepo].join('/'));

})()
