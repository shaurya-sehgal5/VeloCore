import React from 'react';
import RepoCard from './RepoCard';
import LoadingState from './LoadingState';

export default function RepoList({ repos, loading, isBusy, onDeploy }) {
  if (loading) return <LoadingState message="fetching repositories from github..." />;
  return (
    <div className="repo-grid">
      {repos?.map((repo) => (
        <RepoCard key={repo.id} repo={repo} isBusy={isBusy} onDeploy={() => onDeploy(repo)} />
      ))}
    </div>
  );
}
