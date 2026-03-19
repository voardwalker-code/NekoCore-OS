(function initEntityCreatorPackageRuntime(globalScope) {
  'use strict';

  const doc = globalScope.document;
  if (!doc || !doc.body) {
    return;
  }

  doc.body.setAttribute('data-creator-package', 'entity-creator');
  globalScope.__creatorPackageRuntime = {
    packagePath: 'apps/entity-creator',
    compatibilityPage: 'create.html'
  };
})(window);
