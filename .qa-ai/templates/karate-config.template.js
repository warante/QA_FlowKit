function fn() {
  const config = {
    baseUrl: 'https://jsonplaceholder.typicode.com'
  };
  // Switch environments: karate.env=dev mvn test (or your runner)
  if (karate.env === 'dev') {
    config.baseUrl = 'https://dev.example.com';
  }
  return config;
}
