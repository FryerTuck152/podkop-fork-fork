# Установка и обновление

## Требования

- OpenWrt 24.10 или новее;
- от 128 МБ оперативной памяти, лучше 256 МБ;
- от 18 до 38 МБ свободной флеш-памяти, в зависимости от [сборки ядра](#сборки-ядра).

## Установка

Подключитесь к роутеру по SSH и выполните:

```sh
sh <(wget -O - https://raw.githubusercontent.com/FryerTuck152/podkop-fork-fork/refs/heads/main/install.sh)
```

Команда устанавливает или обновляет [Forkop](https://github.com/FryerTuck152/podkop-fork-fork) и [sing-box-extended](https://github.com/shtorm-7/sing-box-extended). Если новая версия меняет формат настроек, Forkop переведёт их сам, а прежние сохранит в `/etc/config/forkop.<версия>-<дата>`.

Если установка не удалась, полный журнал лежит в `/tmp/forkop-install.log`.

## Ядро

Установщик ставит последний релиз [sing-box-extended](https://github.com/shtorm-7/sing-box-extended): один пакет со всеми протоколами, без выбора сборки. Пакет `sing-box-extended` предоставляет `sing-box`, поэтому Forkop работает на нём как на своём ядре.

## Удаление

```sh
sh <(wget -O - https://raw.githubusercontent.com/FryerTuck152/podkop-fork-fork/refs/heads/main/install.sh) --uninstall
```

Команда удаляет `forkop`, `luci-app-forkop`, `luci-i18n-forkop-ru`, ядро `sing-box-extended` и зависимости, которые больше ничему не нужны, а вместе с ними кеш ядра и скачанный дашборд YACD.
