import { copyToClipboard } from '../../../helpers/copyToClipboard';
import { E } from '../../../helpers/element';
import { showToast } from '../../../helpers/showToast';
import {
  renderCircleCheckIcon24,
  renderCircleStopIcon24,
  renderCircleXIcon24,
  renderCopyIcon24,
  renderDownloadIcon24,
  renderFileTextIcon24,
  renderLoaderCircleIcon24,
  renderSquareTerminalIcon24,
} from '../../../icons';
import { renderButton, renderModal } from '../../../partials';
import { isActiveLuciTab } from '../../helpers/isActiveLuciTab';
import { store } from '../../services/store.service';
import { ensureSystemInfo } from '../../services/systemInfo.service';
import type { Forkop } from '../../types';
import { installerApi } from './installerApi';
import { createInstallerRun, InstallerRunState } from './installerRun';
import { pageRoot } from './render';
import { formatRunTime } from './runTime';
import { createTerminal } from './terminal';

let controllerInitialized = false;

// install.sh speaks Russian or English; the page asks in its own language.
function installerLanguage() {
  return document.documentElement.lang.toLowerCase().startsWith('ru')
    ? 'ru'
    : 'en';
}

function componentsTabShown() {
  return (
    store.get().tabService.current === 'components' ||
    isActiveLuciTab('components')
  );
}

function part<T extends HTMLElement>(root: HTMLElement, id: string) {
  return root.querySelector(`#${id}`) as T;
}

function statusOf(state: InstallerRunState): {
  tone: 'progress' | 'success' | 'error';
  icon: () => SVGSVGElement;
  text: string;
} {
  if (state.starting || state.running) {
    let text = _('in progress');
    if (state.lost) {
      text = _('no answer from the router');
    } else if (state.stopping) {
      text = _('stopping...');
    }
    return { tone: 'progress', icon: renderLoaderCircleIcon24, text };
  }
  if (state.exit === 0) {
    return { tone: 'success', icon: renderCircleCheckIcon24, text: _('done') };
  }
  return {
    tone: 'error',
    icon: renderCircleXIcon24,
    text: state.interrupted || state.stopping ? _('interrupted') : _('failed'),
  };
}

export function initController(): void {
  if (controllerInitialized || !pageRoot) {
    return;
  }
  controllerInitialized = true;
  const root = pageRoot;

  const terminal = createTerminal({
    label: _('Installer output'),
    onInput: (data) => void run.input(data),
    onInterrupt: () => void run.stop(),
  });
  const runStatus = E('span', { class: 'fkp_components-page__run-status' });
  const copyButton = E(
    'button',
    {
      type: 'button',
      class: 'btn cbi-button fkp_components-page__icon-button',
      title: _('Copy the output'),
      'aria-label': _('Copy the output'),
      click: () => copyToClipboard(terminal.text()),
    },
    [renderCopyIcon24()],
  );
  const stopButton = E(
    'button',
    {
      type: 'button',
      class:
        'btn cbi-button cbi-button-remove fkp_components-page__icon-button',
      title: _('Interrupt the installer'),
      'aria-label': _('Interrupt the installer'),
      click: () => void run.stop(),
    },
    [renderCircleStopIcon24()],
  ) as HTMLButtonElement;
  const logButton = E(
    'button',
    {
      type: 'button',
      class: 'btn cbi-button fkp_components-page__icon-button',
      title: _('Installer log'),
      'aria-label': _('Installer log'),
      click: () => void openLog(),
    },
    [renderFileTextIcon24()],
  ) as HTMLButtonElement;
  const runSide = E('div', { class: 'fkp_components-page__run-side' }, [
    runStatus,
    stopButton,
    logButton,
    copyButton,
  ]);
  part(root, 'components-run').append(
    E('div', { class: 'fkp_components-page__run-header' }, [
      E('div', { class: 'fkp_components-page__run-title' }, [
        renderSquareTerminalIcon24(),
        E('span', {}, _('Terminal')),
      ]),
      runSide,
    ]),
    terminal.element,
  );

  let runState: InstallerRunState | null = null;
  let runDrawn = '';

  function renderRun(state: InstallerRunState) {
    runSide.hidden = !state.id && !state.starting;
    stopButton.hidden = !state.running || !state.id;
    stopButton.disabled = state.stopping;
    logButton.hidden = !state.log;
    terminal.setInput(state.running && state.interactive);
    const live = state.starting || state.running;
    const at = live ? state.startedAt : state.finishedAt;
    const drawn = JSON.stringify([
      live,
      at,
      state.exit,
      state.interrupted,
      state.stopping,
      state.lost,
    ]);
    if (drawn === runDrawn) {
      return;
    }
    runDrawn = drawn;
    const status = statusOf(state);
    runStatus.className = `fkp_components-page__run-status fkp_components-page__run-status--${status.tone}`;
    runStatus.replaceChildren(
      ...(at === null
        ? []
        : [
            E(
              'span',
              { class: 'fkp_components-page__run-time' },
              formatRunTime(at),
            ),
          ]),
      status.icon(),
      E('span', {}, status.text),
    );
  }

  async function openLog() {
    logButton.disabled = true;
    try {
      const text = await installerApi.log();
      ui.showModal(_('Installer log'), renderModal(text, 'forkop-install-log'));
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : String(error),
        'error',
      );
    } finally {
      logButton.disabled = false;
    }
  }

  // Redrawn only when they change: a button replaced between press and release loses the click.
  let actionsDrawn = '';

  function renderActions(state: InstallerRunState) {
    const operation = store.get().serviceState.data.forkopBusy;
    const live = state.starting || state.running;
    // a start, stop or apply in progress leaves install.sh nothing safe to stop
    const blocked = live || (operation !== null && operation !== 'install');
    const drawn = JSON.stringify([blocked, live && state.action]);
    if (drawn === actionsDrawn) {
      return;
    }
    actionsDrawn = drawn;
    const button = (
      action: Forkop.InstallerAction,
      text: string,
      onClick: () => void,
    ) =>
      renderButton({
        classNames: ['cbi-button-apply'],
        icon: renderDownloadIcon24,
        text,
        loading: live && state.action === action,
        disabled: blocked,
        onClick,
      });

    part(root, 'components-actions').replaceChildren(
      button('update-app', _('Update Forkop'), () =>
        void run.start('update-app'),
      ),
      // The core comes from sing-box-extended's releases, not install.sh's: no button yet.
      renderButton({
        classNames: ['cbi-button-apply'],
        icon: renderDownloadIcon24,
        text: _('Update core'),
        disabled: true,
        onClick: () => undefined,
      }),
    );
  }

  function renderVersions() {
    const info = store.get().diagnosticsSystemInfo;
    const loaded = Boolean(info.loaded);
    part(root, 'components-forkop-version').replaceChildren(
      loaded ? info.forkop_version : '',
    );
    part(root, 'components-core-version').replaceChildren(
      loaded ? info.sing_box_version : '',
    );
  }

  const run = createInstallerRun({
    api: installerApi,
    terminal,
    lang: installerLanguage,
    onChange: (state) => {
      runState = state;
      renderRun(state);
      renderActions(state);
    },
    onStartFailed: (message) => showToast(message, 'error'),
    onAfterRun: () => window.location.reload(),
  });

  renderRun(run.state);
  renderActions(run.state);
  renderVersions();
  store.subscribeKey('diagnosticsSystemInfo', renderVersions);
  store.subscribeKey('tabService', () => {
    run.setShown(componentsTabShown());
    if (componentsTabShown()) {
      void ensureSystemInfo();
    }
  });
  // A run that began on another page or in a terminal shows up here as the feed reports it.
  store.subscribeKey('serviceState', (serviceState) => {
    if (serviceState.data.forkopBusy === 'install') {
      run.refresh();
    }
    renderActions(runState ?? run.state);
  });
  if (componentsTabShown()) {
    run.setShown(true);
    void ensureSystemInfo();
  } else if (store.get().serviceState.data.forkopBusy === 'install') {
    run.refresh();
  }
}
