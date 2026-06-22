alter table public.products
drop constraint if exists products_category_check,
drop constraint if exists products_dance_style_check,
drop constraint if exists products_color_check,
drop constraint if exists products_size_check,
drop constraint if exists products_status_check;

alter table public.products
add constraint products_category_check
check (category in ('ドレス', 'スカート', 'トップス', 'メンズシャツ', 'シューズ', 'アクセサリー', '小物', '一般服')),
add constraint products_dance_style_check
check (dance_style in ('ラテン', 'スタンダード', '練習着', '一般服')),
add constraint products_color_check
check (color in ('赤', '青', '黒', '白', 'ピンク', '紫', '緑', '黄', 'ゴールド', 'シルバー', 'ベージュ', '茶', 'グレー', 'ネイビー', '多色', '不明')),
add constraint products_size_check
check (size in ('F', 'S', 'M', 'L', 'LL', '3L以上', '不明')),
add constraint products_status_check
check (status in ('在庫中', '販売済', '値下げ', '保留'));

alter table public.products
alter column status set default '在庫中';
