import { FORKOP_UCI_PACKAGE } from '../../../../constants';

// The device a panel sees on every subscription. Empty options fall back to what the router
// reports, and nothing rewrites a value that is set here.
const HEADER_FIELDS: [string, string, string][] = [
  ['header_hwid', 'X-HWID', ''],
  ['header_device_os', 'X-Device-OS', ''],
  ['header_ver_os', 'X-Ver-OS', ''],
  ['header_device_model', 'X-Device-Model', ''],
  ['header_device_locale', 'X-Device-Locale', ''],
  ['header_user_agent', 'User-Agent', ''],
];

export function addHeaderOptions(section: CBISection) {
  for (const [option, header, fallback] of HEADER_FIELDS) {
    const o = section.option(
      form.Value,
      option,
      header,
      _('Sent with every subscription request unless the subscription sets its own'),
    );
    o.default = fallback;
    o.placeholder = fallback || _('automatic');
    o.rmempty = true;
    o.write = function (section_id: string, value: string) {
      const normalized = value ? `${value}`.trim() : '';
      if (normalized.length) {
        uci.set(FORKOP_UCI_PACKAGE, section_id, option, normalized);
      } else {
        uci.unset(FORKOP_UCI_PACKAGE, section_id, option);
      }
    };
  }
}
