# Bicep template for Azure resources (Service Bus, MongoDB, App Service)
param location string = resourceGroup().location
param serviceBusNamespaceName string
param mongoDbAccountName string
param appServiceName string

resource sb 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: serviceBusNamespaceName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
}

resource mongo 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: mongoDbAccountName
  location: location
  kind: 'MongoDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
  }
}

resource app 'Microsoft.Web/sites@2022-09-01' = {
  name: appServiceName
  location: location
  kind: 'app'
  properties: {
    serverFarmId: ''
  }
}
