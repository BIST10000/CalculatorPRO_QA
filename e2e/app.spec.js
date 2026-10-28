import {test,expect} from '@playwright/test';

test('exact Python form, defaults, polynomial shapes, numbering and no date branding',async({page})=>{
  await page.goto('/');
  await expect(page).toHaveTitle('Качество ПО');
  await expect(page.locator('.input-columns input[type=text]')).toHaveCount(47);
  await expect(page.locator('.input-columns select')).toHaveCount(7);
  await expect(page.getByLabel('u5 начало',{exact:true})).toHaveValue('0.9');
  await expect(page.getByLabel('u125 начало',{exact:true})).toHaveValue('0.43');
  const shapes=[4,2,3,2,3,2,3];
  for(let i=0;i<7;i++){
    await expect(page.locator('.function-row').nth(i).locator('input')).toHaveCount(shapes[i]);
    await expect(page.getByLabel(`Строка ${i+1} номер F`,{exact:true})).toHaveValue(String(i+1));
    await expect(page.getByLabel(`Строка ${i+1} номер F`,{exact:true}).locator('option')).toHaveCount(126);
  }
  await expect(page.locator('body')).not.toContainText(/лаборатор|\b2021\b/i);
  await page.getByRole('button',{name:'03О модели'}).click();
  await expect(page.locator('body')).not.toContainText(/лаборатор|\b2021\b/i);
});

test('comparison scenarios, recalculation, CSV, blank validation and id 126',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.locator('#preset').selectOption('comparison');
  await page.getByRole('button',{name:'Рассчитать →'}).click();
  await expect(page.getByText('Есть выход за допустимые границы')).toBeVisible();
  await expect(page.getByText(/80 точек/)).toBeVisible();
  await expect(page.getByRole('row').filter({hasText:'сопровождаемость'}).first()).toContainText('5,048396');
  await expect(page.getByRole('heading',{name:'¾ времени'})).toBeVisible();
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать CSV'}).click();await downloaded;
  await page.getByRole('button',{name:'01Параметры'}).click();
  await page.getByLabel('Строка 1 коэффициент 4',{exact:true}).fill('0,1');
  await expect(page.getByText('Параметры изменены.',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Рассчитать →'}).click();
  await expect(page.getByRole('row').filter({hasText:'сопровождаемость'}).first()).toContainText('3,085221');
  await page.getByRole('button',{name:'01Параметры'}).click();
  await page.getByLabel('u5 начало',{exact:true}).fill('');
  await page.getByRole('button',{name:'Рассчитать →'}).click();await expect(page.getByRole('alert')).toContainText('пустое');
  await page.getByLabel('u5 начало',{exact:true}).fill('0.5');
  await page.getByLabel('Строка 7 номер F',{exact:true}).selectOption('126');
  await page.getByRole('button',{name:'Рассчитать →'}).click();
  await expect(page.getByText(/80 точек/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('minimal input JSON roundtrip and responsive page',async({page})=>{
  await page.goto('/');await page.locator('#preset').selectOption('comparison');
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Сохранить сценарий'}).click();const file=await downloaded;
  await page.locator('#preset').selectOption('weaker');
  await page.locator('input[type=file]').setInputFiles(await file.path());
  await expect(page.getByLabel('Строка 1 коэффициент 4',{exact:true})).toHaveValue('1');
  await page.screenshot({path:'verification/parameters-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.viewport);
  await page.screenshot({path:'verification/parameters-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Рассчитать →'}).click();
  await expect(page.getByText(/80 точек/)).toBeVisible();
});

test('all five classic radar snapshots have individual scales and all time-series lines are solid',async({page})=>{
  await page.goto('/');await page.locator('#preset').selectOption('comparison');
  await page.getByRole('button',{name:'Рассчитать →'}).click();
  await expect(page.locator('.radar svg')).toHaveCount(5);
  await expect(page.locator('.radar-values')).toHaveCount(5);
  await expect(page.locator('.radar-initial')).toHaveCount(4);
  await expect(page.locator('.radar-values').first()).toHaveAttribute('fill','none');
  for(const time of ['0','0,25','0,5','0,75','1'])await expect(page.locator('.radar small').filter({hasText:new RegExp(`^t = ${time}$`)})).toHaveCount(1);
  const geometry=await page.locator('.radar svg').first().evaluate(svg=>({
    first:Number(svg.querySelector('[data-axis="5"] text').getAttribute('x')),
    next:Number(svg.querySelector('[data-axis="24"] text').getAttribute('x')),
  }));
  expect(geometry.next).toBeLessThan(geometry.first);
  const paths=await page.locator('.radar-values').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('points')));
  expect(new Set(paths).size).toBe(5);
  const scales=await page.locator('.radar p').allTextContents();expect(new Set(scales).size).toBeGreaterThan(1);
  await page.getByText('Выбрать линии (6 из 28)',{exact:true}).click();
  await page.getByRole('checkbox',{name:/^u56 ·/}).check();
  await expect(page.locator('polyline[data-series="8"]')).not.toHaveAttribute('stroke-dasharray');
  await expect(page.locator('.chart [stroke-dasharray]')).toHaveCount(0);
  await page.getByRole('checkbox',{name:/^u5 ·/}).uncheck();
  await expect(page.locator('polyline[data-series="8"]')).not.toHaveAttribute('stroke-dasharray');
  await page.screenshot({path:'verification/signed-snapshots.png',fullPage:true});
});
