// Bicep template for Azure resources (Service Bus, MongoDB, App Service, Azure Cognitive Search)
param location string = resourceGroup().location
param serviceBusNamespaceName string
param mongoDbAccountName string
param appServiceName string
param searchServiceName string

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

resource search 'Microsoft.Search/searchServices@2023-11-01' = {
  name: searchServiceName
  location: location
  sku: {
    name: 'standard'
  }
  properties: {
    hostingMode: 'default'
    partitionCount: 1
    replicaCount: 1
    publicNetworkAccess: 'enabled'
  }
}
