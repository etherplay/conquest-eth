export async function get(): Promise<{body: string; headers: {'content-type': string}}> {
  return {
    body: JSON.stringify(
      {
        name: 'Basic Spaceship Marketplace',
        iframe: './',
        config: {
          actions: [
            {
              title: 'Market',
              action: 'show_planet',
              panelConditions: ['owner', 'planet:basic_sale'],
              mapConditions: ['planet:basic_sale'],
            },
          ],
        },
      },
      null,
      2
    ),
    headers: {'content-type': 'application/json'},
  };
}
