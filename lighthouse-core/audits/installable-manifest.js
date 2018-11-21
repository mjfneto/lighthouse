/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ManifestValues = require('../computed/manifest-values.js');

/**
 * @fileoverview
 * Audits if the page's web app manifest qualifies for triggering a beforeinstallprompt event.
 * https://github.com/GoogleChrome/lighthouse/issues/23#issuecomment-270453303
 *
 * Requirements:
 *   * manifest is not empty
 *   * manifest has valid start url
 *   * manifest has a valid name
 *   * manifest has a valid shortname
 *   * manifest display property is standalone, minimal-ui, or fullscreen
 *   * manifest contains icon that's a png and size >= 192px
 */

class InstallableManifest {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'installable-manifest',
      title: 'Web app manifest meets the installability requirements',
      failureTitle: 'Web app manifest does not meet the installability requirements',
      description: 'Browsers can proactively prompt users to add your app to their homescreen, ' +
          'which can lead to higher engagement. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/install-prompt).',
      requiredArtifacts: ['URL', 'Manifest'],
    };
  }

  /**
   * @param {LH.Artifacts.ManifestValues} manifestValues
   * @return {Array<string>}
   */
  static getManifestFailures(manifestValues) {
    const bannerCheckIds = [
      'hasName',
      // Technically shortname isn't required (if name is defined):
      //   https://cs.chromium.org/chromium/src/chrome/browser/installable/installable_manager.cc?type=cs&q=IsManifestValidForWebApp+f:cc+-f:test&sq=package:chromium&l=473
      // Despite this, we think it's better to require it anyway.
      // short_name is preferred for the homescreen icon, but a longer name can be used in
      // the splash screen and app title. Given the different usecases, we'd like to make it clearer
      // that the developer has two possible strings to work with.
      'hasShortName',
      'hasStartUrl',
      'hasPWADisplayValue',
      'hasIconsAtLeast192px',
    ];

    return manifestValues.allChecks
      .filter(check => bannerCheckIds.includes(check.id) && !check.passing)
      .map(check => check.failureText);
  }

  /**
   * @param {LH.Artifacts.ManifestValues} manifestValues
   * @return {Record<LH.Artifacts.ManifestValueCheckID, boolean>}
   */
  static getManifestChecks(manifestValues) {
    const checks = /** @type {Record<LH.Artifacts.ManifestValueCheckID, boolean>} */ ({});
    manifestValues.allChecks.forEach(check => {
      checks[check.id] = check.passing;
    });
    return checks;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const manifestValues = await ManifestValues.request(artifacts.Manifest, context);
    const failures = InstallableManifest.getManifestFailures(manifestValues);

    if (manifestValues.isParseFailure) {
      failures.push(manifestValues.parseFailureReason);
    }

    const checks = this.getManifestChecks(manifestValues);
    const details = {items: [{
      failures,
      ...checks,
    }]};

    if (failures.length > 0) {
      return {
        rawValue: false,
        explanation: `Failures: ${failures.join(',\n')}.`,
        details,
      };
    }

    return {
      rawValue: true,
      details,
    };
  }
}

module.exports = InstallableManifest;
